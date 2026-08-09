import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { IMPORT_FIELDS } from "@/lib/services/imports";
import { PageHeader } from "@/components/admin/ui";
import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata = { title: "Import blogs · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function ImportBlogsPage() {
  await requirePermission("content.blog.import");
  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="Import pieces"
        description="Upload a spreadsheet, check the preview, then confirm. A piece whose slug already exists is updated, not duplicated."
        actions={
          <Link
            href="/admin/blog"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
          >
            All pieces
          </Link>
        }
      />
      <ImportWizard
        target="articles"
        fields={IMPORT_FIELDS.articles}
        templateName="healerji-blogs-template.csv"
      />
    </>
  );
}
