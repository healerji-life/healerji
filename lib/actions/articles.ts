"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getArticleById } from "@/lib/services/articles";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import { fromPostgrestError } from "@/lib/services/types";
import { slugify } from "@/lib/format";

/**
 * Blog CMS mutations.
 *
 * Editors may manage blogs (requirement 8), so these authorise on
 * `content.blog.manage` rather than an admin role. RLS on articles permits
 * is_staff(), matching.
 *
 * Body handling: the form submits markdown. The database's sync_article_body
 * trigger derives body_blocks from it, which is what the public renderer reads —
 * so the existing article template keeps working unchanged and the two
 * representations cannot drift.
 */

export interface ArticleFormState {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string>;
}

const articleSchema = z.object({
  title: z.string().min(3, "Give the piece a title.").max(200),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.").max(120),
  kind: z.enum(["article", "guide", "story"]),
  categorySlug: z.string().max(80),
  pathway: z.string().max(80),
  readMinutes: z.coerce.number().int().min(1).max(120),
  excerpt: z.string().max(400),
  bodyMarkdown: z.string().max(60000),
  coverUrl: z.string().url().or(z.literal("")),
  coverAlt: z.string().max(200),
  authorName: z.string().min(2).max(120),
  tags: z.string().max(300),
  featured: z.boolean(),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(180),
  ogImageUrl: z.string().url().or(z.literal("")),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  publishedAt: z.string().max(40),
});

function parse(formData: FormData) {
  return articleSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "") || String(formData.get("title") ?? "")),
    kind: String(formData.get("kind") ?? "article"),
    categorySlug: String(formData.get("categorySlug") ?? ""),
    pathway: String(formData.get("pathway") ?? ""),
    readMinutes: formData.get("readMinutes") ?? 5,
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    bodyMarkdown: String(formData.get("bodyMarkdown") ?? ""),
    coverUrl: String(formData.get("coverUrl") ?? ""),
    coverAlt: String(formData.get("coverAlt") ?? ""),
    authorName: String(formData.get("authorName") ?? "The HealerJi Journal").trim(),
    tags: String(formData.get("tags") ?? ""),
    featured: formData.get("featured") === "on",
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    ogImageUrl: String(formData.get("ogImageUrl") ?? ""),
    status: String(formData.get("status") ?? "draft"),
    publishedAt: String(formData.get("publishedAt") ?? ""),
  });
}

function fieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function toRow(v: z.infer<typeof articleSchema>, actorId: string) {
  /**
   * A scheduled piece needs a future date; the DB CHECK requires published_at
   * whenever status is 'scheduled'. Publishing without a date means "now".
   */
  const publishedAt =
    v.publishedAt !== ""
      ? new Date(v.publishedAt).toISOString()
      : v.status === "published"
        ? new Date().toISOString()
        : null;

  return {
    title: v.title,
    slug: v.slug,
    kind: v.kind,
    category_slug: v.categorySlug || null,
    pathway: v.pathway || null,
    read_minutes: v.readMinutes,
    excerpt: v.excerpt,
    body_markdown: v.bodyMarkdown,
    cover_url: v.coverUrl || null,
    cover_alt: v.coverAlt || null,
    author_name: v.authorName,
    tags: v.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20),
    featured: v.featured,
    seo_title: v.seoTitle || null,
    seo_description: v.seoDescription || null,
    og_image_url: v.ogImageUrl || null,
    status: v.status,
    published_at: publishedAt,
    updated_by: actorId,
  };
}

function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/library");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath(`/library/${slug}`);
  }
  revalidatePath("/admin/blog");
}

export async function createArticleAction(
  _prev: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const auth = await authorise("content.blog.manage");
  if (!auth.ok) return { error: auth.error };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  if (parsed.data.status === "scheduled" && parsed.data.publishedAt === "") {
    return { error: "A scheduled piece needs a publication date.", fieldErrors: { publishedAt: "Choose a date and time." } };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { data, error } = await supabase
    .from("articles")
    .insert({ ...toRow(parsed.data, auth.viewer.id), created_by: auth.viewer.id })
    .select("id, slug, status")
    .single();

  if (error) {
    const mapped = fromPostgrestError(error);
    return {
      error: mapped.error.code === "conflict"
        ? "That slug is already used by another piece. Choose another."
        : "Couldn't create that piece. Please try again.",
    };
  }

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.blogCreated,
    resourceType: "article",
    resourceId: data.id,
    summary: `Created "${parsed.data.title}"`,
    after: { slug: data.slug, status: data.status },
  });

  revalidateBlog(data.slug);
  redirect(`/admin/blog/${data.id}?created=1`);
}

export async function updateArticleAction(
  _prev: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const auth = await authorise("content.blog.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing article id." };

  const before = await getArticleById(id);
  if (!before.ok) return { error: before.error.message };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  if (parsed.data.status === "scheduled" && parsed.data.publishedAt === "") {
    return { error: "A scheduled piece needs a publication date.", fieldErrors: { publishedAt: "Choose a date and time." } };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { error } = await supabase
    .from("articles")
    .update(toRow(parsed.data, auth.viewer.id))
    .eq("id", id);

  if (error) {
    const mapped = fromPostgrestError(error);
    return {
      error: mapped.error.code === "conflict"
        ? "That slug is already used by another piece."
        : "Couldn't save those changes. Please try again.",
    };
  }

  const statusChanged = before.data.status !== parsed.data.status;
  await recordAudit({
    viewer: auth.viewer,
    action:
      statusChanged && parsed.data.status === "published"
        ? AUDIT_ACTIONS.blogPublished
        : statusChanged && before.data.status === "published"
          ? AUDIT_ACTIONS.blogUnpublished
          : AUDIT_ACTIONS.blogUpdated,
    resourceType: "article",
    resourceId: id,
    summary: `Updated "${parsed.data.title}"`,
    before: { status: before.data.status, slug: before.data.slug },
    after: { status: parsed.data.status, slug: parsed.data.slug },
  });

  // Both slugs, so a rename does not leave a stale page at the old address.
  revalidateBlog(before.data.slug);
  revalidateBlog(parsed.data.slug);
  revalidatePath(`/admin/blog/${id}`);

  return {
    notice:
      parsed.data.status === "published"
        ? "Saved and live on the website."
        : parsed.data.status === "scheduled"
          ? "Saved. It will appear automatically at the scheduled time."
          : "Saved as a draft — not visible publicly.",
  };
}

/** Status-only transitions, for the list view's quick actions. */
const TRANSITIONS = ["draft", "published", "archived"] as const;

export async function setArticleStatusAction(formData: FormData): Promise<void> {
  const auth = await authorise("content.blog.publish");
  if (!auth.ok) redirect("/admin/blog?error=forbidden");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(TRANSITIONS as readonly string[]).includes(status)) redirect("/admin/blog?error=bad_status");

  const before = await getArticleById(id);
  if (!before.ok) redirect("/admin/blog?error=not_found");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/blog?error=unconfigured");

  const patch: Record<string, unknown> = { status, updated_by: auth.viewer.id };
  // Publishing something that has never had a date gets one now.
  if (status === "published" && !before.data.published_at) {
    patch.published_at = new Date().toISOString();
  }
  if (status === "archived") patch.archived_at = new Date().toISOString();

  await supabase.from("articles").update(patch).eq("id", id);

  await recordAudit({
    viewer: auth.viewer,
    action:
      status === "published" ? AUDIT_ACTIONS.blogPublished
        : status === "archived" ? AUDIT_ACTIONS.blogArchived
        : AUDIT_ACTIONS.blogUnpublished,
    resourceType: "article",
    resourceId: id,
    summary: `"${before.data.title}" → ${status}`,
    before: { status: before.data.status },
    after: { status },
  });

  revalidateBlog(before.data.slug);
  redirect(`/admin/blog?updated=${encodeURIComponent(before.data.slug)}`);
}
