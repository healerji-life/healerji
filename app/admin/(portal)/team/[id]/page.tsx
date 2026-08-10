import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getTeamMember } from "@/lib/services/team";
import { updateTeamMemberAction } from "@/lib/actions/team";
import { isConfigured } from "@/lib/services/integrations";
import { PageHeader } from "@/components/admin/ui";
import { TeamForm } from "@/components/admin/team-form";

export const metadata = { title: "Edit team member · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("content.pages.manage");
  const { id } = await params;
  const result = await getTeamMember(id);
  if (!result.ok) notFound();

  return (
    <>
      <PageHeader eyebrow="Team" title={result.data.name} description={result.data.role} />
      <TeamForm
        action={updateTeamMemberAction}
        member={result.data}
        cloudinaryConfigured={isConfigured("cloudinary")}
      />
    </>
  );
}
