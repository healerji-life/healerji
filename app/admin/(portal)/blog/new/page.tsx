import { requirePermission } from "@/lib/auth/session";
import { listArticleCategories } from "@/lib/services/articles";
import { isConfigured } from "@/lib/services/integrations";
import { createArticleAction } from "@/lib/actions/articles";
import { PageHeader } from "@/components/admin/ui";
import { ArticleForm } from "@/components/admin/article-form";

export const metadata = { title: "New piece · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requirePermission("content.blog.manage");
  const categories = await listArticleCategories();

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="New piece"
        description="Saves as a draft unless you set the status to published."
      />
      <ArticleForm
        action={createArticleAction}
        submitLabel="Create piece"
        cloudinaryConfigured={isConfigured("cloudinary")}
        categories={(categories.ok ? categories.data : []).map((c) => ({ value: c.slug, label: c.name }))}
      />
    </>
  );
}
