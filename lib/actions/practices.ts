"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPracticeById } from "@/lib/services/practices";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import { fromPostgrestError } from "@/lib/services/types";
import type { PracticeRow } from "@/lib/supabase/types";
import { slugify } from "@/lib/format";
import { PRACTICE_CATEGORIES, practiceMinutesFromSteps } from "@/lib/content/practice";

/**
 * Guided practice mutations.
 *
 * Gated on `content.practices.manage`, which editors hold — practices are
 * content, not configuration. RLS on public.practices permits is_staff(),
 * matching.
 *
 * The step list is validated strictly. A practice is something a person follows
 * with their eyes closed while breathing, so a malformed step is not a cosmetic
 * bug: it would strand them mid-session.
 */

export interface PracticeFormState {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string>;
}

const stepSchema = z.object({
  say: z.string().min(3, "Each step needs something to say.").max(600),
  seconds: z.coerce.number().int().min(5, "A step must last at least 5 seconds.").max(1800),
});

const practiceSchema = z.object({
  title: z.string().min(3, "Give the practice a title.").max(160),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.").max(120),
  category: z.enum(PRACTICE_CATEGORIES),
  summary: z.string().min(10, "Write a short standfirst.").max(400),
  afterNote: z.string().max(800),
  pathway: z.string().max(80),
  chakraSlug: z.string().max(80),
  audioUrl: z.string().url().or(z.literal("")),
  coverUrl: z.string().url().or(z.literal("")),
  featured: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(9999),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  publishedAt: z.string().max(40),
  steps: z.array(stepSchema).min(1, "A practice needs at least one step.").max(40),
});

function parse(formData: FormData) {
  let steps: unknown = [];
  try {
    steps = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    steps = [];
  }

  return practiceSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "") || String(formData.get("title") ?? "")),
    category: String(formData.get("category") ?? "Breath"),
    summary: String(formData.get("summary") ?? "").trim(),
    afterNote: String(formData.get("afterNote") ?? "").trim(),
    pathway: String(formData.get("pathway") ?? ""),
    chakraSlug: String(formData.get("chakraSlug") ?? ""),
    audioUrl: String(formData.get("audioUrl") ?? ""),
    coverUrl: String(formData.get("coverUrl") ?? ""),
    featured: formData.get("featured") === "on",
    displayOrder: formData.get("displayOrder") ?? 0,
    status: String(formData.get("status") ?? "draft"),
    publishedAt: String(formData.get("publishedAt") ?? ""),
    steps,
  });
}

function fieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 1 ? `${String(issue.path[0])}.${String(issue.path[1])}` : String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function toRow(v: z.infer<typeof practiceSchema>, actorId: string) {
  const publishedAt =
    v.publishedAt !== ""
      ? new Date(v.publishedAt).toISOString()
      : v.status === "published"
        ? new Date().toISOString()
        : null;

  return {
    title: v.title,
    slug: v.slug,
    category: v.category,
    summary: v.summary,
    after_note: v.afterNote,
    pathway: v.pathway || null,
    chakra_slug: v.chakraSlug || null,
    audio_url: v.audioUrl || null,
    cover_url: v.coverUrl || null,
    // Derived from the steps, so the card's stated length is always the real one.
    minutes: practiceMinutesFromSteps(v.steps),
    steps: v.steps as never,
    featured: v.featured,
    display_order: v.displayOrder,
    status: v.status,
    published_at: publishedAt,
    updated_by: actorId,
  };
}

function revalidatePractices(slug?: string) {
  revalidatePath("/practices");
  revalidatePath("/library");
  if (slug) revalidatePath(`/practices/${slug}`);
  revalidatePath("/admin/practices");
}

export async function createPracticeAction(
  _prev: PracticeFormState,
  formData: FormData
): Promise<PracticeFormState> {
  const auth = await authorise("content.practices.manage");
  if (!auth.ok) return { error: auth.error };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  if (parsed.data.status === "scheduled" && parsed.data.publishedAt === "") {
    return { error: "A scheduled practice needs a publication date.", fieldErrors: { publishedAt: "Choose a date and time." } };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { data, error } = await supabase
    .from("practices")
    .insert({ ...toRow(parsed.data, auth.viewer.id), created_by: auth.viewer.id })
    .select("id, slug")
    .single();

  if (error) {
    const mapped = fromPostgrestError(error);
    return {
      error: mapped.error.code === "conflict"
        ? "That slug is already used by another practice."
        : "Couldn't create that practice. Please try again.",
    };
  }

  await recordAudit({
    viewer: auth.viewer,
    action: "practice.created",
    resourceType: "practice",
    resourceId: data.id,
    summary: `Created practice "${parsed.data.title}"`,
    after: { slug: data.slug, status: parsed.data.status },
  });

  revalidatePractices(data.slug);
  redirect(`/admin/practices/${data.id}?created=1`);
}

export async function updatePracticeAction(
  _prev: PracticeFormState,
  formData: FormData
): Promise<PracticeFormState> {
  const auth = await authorise("content.practices.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing practice id." };

  const before = await getPracticeById(id);
  if (!before.ok) return { error: before.error.message };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  if (parsed.data.status === "scheduled" && parsed.data.publishedAt === "") {
    return { error: "A scheduled practice needs a publication date.", fieldErrors: { publishedAt: "Choose a date and time." } };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { error } = await supabase.from("practices").update(toRow(parsed.data, auth.viewer.id)).eq("id", id);
  if (error) {
    const mapped = fromPostgrestError(error);
    return {
      error: mapped.error.code === "conflict"
        ? "That slug is already used by another practice."
        : "Couldn't save those changes. Please try again.",
    };
  }

  await recordAudit({
    viewer: auth.viewer,
    action: before.data.status !== parsed.data.status ? "practice.status_changed" : "practice.updated",
    resourceType: "practice",
    resourceId: id,
    summary: `Updated "${parsed.data.title}"`,
    before: { status: before.data.status, slug: before.data.slug, minutes: before.data.minutes },
    after: { status: parsed.data.status, slug: parsed.data.slug },
  });

  // Both slugs, so a rename leaves no stale page behind.
  revalidatePractices(before.data.slug);
  revalidatePractices(parsed.data.slug);
  revalidatePath(`/admin/practices/${id}`);

  return {
    notice:
      parsed.data.status === "published"
        ? "Saved and live on the website."
        : parsed.data.status === "scheduled"
          ? "Saved. It will appear automatically at the scheduled time."
          : "Saved as a draft — not visible publicly.",
  };
}

const TRANSITIONS = ["draft", "published", "archived"] as const;

export async function setPracticeStatusAction(formData: FormData): Promise<void> {
  const auth = await authorise("content.practices.manage");
  if (!auth.ok) redirect("/admin/practices?error=forbidden");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof TRANSITIONS)[number];
  if (!TRANSITIONS.includes(status)) redirect("/admin/practices?error=bad_status");

  const before = await getPracticeById(id);
  if (!before.ok) redirect("/admin/practices?error=not_found");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/practices?error=unconfigured");

  const patch: Partial<PracticeRow> = { status, updated_by: auth.viewer.id };
  if (status === "published" && !before.data.published_at) {
    patch.published_at = new Date().toISOString();
  }

  await supabase.from("practices").update(patch).eq("id", id);

  await recordAudit({
    viewer: auth.viewer,
    action: "practice.status_changed",
    resourceType: "practice",
    resourceId: id,
    summary: `"${before.data.title}" → ${status}`,
    before: { status: before.data.status },
    after: { status },
  });

  revalidatePractices(before.data.slug);
  redirect(`/admin/practices?updated=${encodeURIComponent(before.data.slug)}`);
}
