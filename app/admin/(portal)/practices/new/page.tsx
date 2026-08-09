import { requirePermission } from "@/lib/auth/session";
import { isConfigured } from "@/lib/services/integrations";
import { createPracticeAction } from "@/lib/actions/practices";
import { PageHeader } from "@/components/admin/ui";
import { PracticeForm } from "@/components/admin/practice-form";

export const metadata = { title: "New practice · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function NewPracticePage() {
  await requirePermission("content.practices.manage");
  return (
    <>
      <PageHeader
        eyebrow="Guided practices"
        title="New practice"
        description="Saves as a draft unless you set the status to published. The card length is calculated from your steps."
      />
      <PracticeForm
        action={createPracticeAction}
        submitLabel="Create practice"
        cloudinaryConfigured={isConfigured("cloudinary")}
      />
    </>
  );
}
