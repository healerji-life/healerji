import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { IMPORT_FIELDS } from "@/lib/services/imports";
import { PageHeader } from "@/components/admin/ui";
import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata = { title: "Import healers · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function ImportHealersPage() {
  await requirePermission("healers.import");
  return (
    <>
      <PageHeader
        eyebrow="Healers"
        title="Import healers"
        description="Upload a spreadsheet, check the preview, then confirm. Nothing is written before you do."
        actions={
          <Link
            href="/admin/healers"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
          >
            All healers
          </Link>
        }
      />
      <ImportWizard
        target="healers"
        fields={IMPORT_FIELDS.healers}
        templateName="healerji-healers-template.csv"
      />
    </>
  );
}
