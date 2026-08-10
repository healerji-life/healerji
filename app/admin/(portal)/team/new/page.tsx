import { requirePermission } from "@/lib/auth/session";
import { createTeamMemberAction } from "@/lib/actions/team";
import { isConfigured } from "@/lib/services/integrations";
import { PageHeader } from "@/components/admin/ui";
import { TeamForm } from "@/components/admin/team-form";

export const metadata = { title: "Add team member · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage() {
  await requirePermission("content.pages.manage");
  return (
    <>
      <PageHeader eyebrow="Team" title="Add person" description="They appear on the About page as soon as their status is active." />
      <TeamForm action={createTeamMemberAction} cloudinaryConfigured={isConfigured("cloudinary")} />
    </>
  );
}
