import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getArticleById, listArticleCategories } from "@/lib/services/articles";
import { isConfigured } from "@/lib/services/integrations";
import { updateArticleAction } from "@/lib/actions/articles";
import { PageHeader, Badge } from "@/components/admin/ui";
import { ArticleForm } from "@/components/admin/article-form";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requirePermission("content.blog.manage");
  const { id } = await params;
  const flags = await searchParams;

  const [article, categories] = await Promise.all([
    getArticleById(id),
    listArticleCategories(),
  ]);

  if (!article.ok) {
    if (article.error.code === "not_found") notFound();
    throw new Error(article.error.message);
  }

  const a = article.data;
  const scheduledAhead =
    a.published_at !== null && new Date(a.published_at).getTime() > Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title={a.title}
        description={`Last updated ${formatDate(a.updated_at, true)}`}
        actions={<Badge tone={a.status === "published" ? "positive" : "neutral"}>{a.status}</Badge>}
      />

      {flags.created ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          Created as {a.status}.{" "}
          {a.status === "published" ? "It is live on the site." : "Set status to Published when you're ready."}
        </p>
      ) : null}

      {a.status === "published" && scheduledAhead ? (
        <p className="mb-4 rounded-sm border-l-2 border-orchid-500 bg-orchid-50 px-4 py-3 text-sm text-plum-900">
          Published with a future date, so it stays hidden until{" "}
          {formatDate(a.published_at, true)}. The public view is time-aware, so no
          further action is needed.
        </p>
      ) : null}

      <ArticleForm
        action={updateArticleAction}
        article={a}
        submitLabel="Save changes"
        cloudinaryConfigured={isConfigured("cloudinary")}
        categories={(categories.ok ? categories.data : []).map((c) => ({ value: c.slug, label: c.name }))}
      />
    </>
  );
}
