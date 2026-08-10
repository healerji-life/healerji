"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/services/team";
import { recordAudit } from "@/lib/services/audit";
import { fromPostgrestError } from "@/lib/services/types";
import type { TeamMemberRow } from "@/lib/supabase/types";

/**
 * Team member mutations.
 *
 * Guarded by content.pages.manage, the permission that already covers editable
 * website copy, so no new role or permission was introduced. RLS restricts
 * writes to is_staff() underneath, which is what actually holds.
 */

export interface TeamFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const STATUSES = ["active", "inactive", "archived"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(120),
  role: z.string().trim().min(1, "A designation is required.").max(120),
  bio: z.string().trim().max(2000, "Keep the biography under 2000 characters.").default(""),
  photoUrl: z.string().trim().url("That doesn't look like a URL.").or(z.literal("")).default(""),
  photoAlt: z.string().trim().max(200).default(""),
  linkedinUrl: z.string().trim().url("That doesn't look like a URL.").or(z.literal("")).default(""),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(STATUSES).default("active"),
});

function parse(formData: FormData) {
  return schema.safeParse({
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    photoUrl: String(formData.get("photoUrl") ?? ""),
    photoAlt: String(formData.get("photoAlt") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    displayOrder: String(formData.get("displayOrder") ?? "0"),
    status: String(formData.get("status") ?? "active"),
  });
}

function fieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

type TeamPatch = Pick<
  TeamMemberRow,
  "name" | "role" | "bio" | "photo_url" | "photo_alt" | "linkedin_url" | "display_order" | "status"
>;

function toRow(data: z.infer<typeof schema>): TeamPatch {
  return {
    name: data.name,
    role: data.role,
    bio: data.bio,
    photo_url: data.photoUrl || null,
    photo_alt: data.photoAlt || null,
    linkedin_url: data.linkedinUrl || null,
    display_order: data.displayOrder,
    status: data.status,
  };
}

/** The public pages that render the team, revalidated after every write. */
function revalidateTeam() {
  revalidatePath("/about");
  revalidatePath("/press");
}

export async function createTeamMemberAction(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const auth = await authorise("content.pages.manage");
  if (!auth.ok) return { error: auth.error };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { data, error } = await supabase
    .from("team_members")
    .insert({ ...toRow(parsed.data), created_by: auth.viewer.id, updated_by: auth.viewer.id })
    .select("id")
    .single();

  if (error) return { error: fromPostgrestError(error, "Couldn't add that person.").error.message };

  await recordAudit({
    viewer: auth.viewer,
    action: "team.created",
    resourceType: "team_member",
    resourceId: data.id,
    summary: `Added ${parsed.data.name} — ${parsed.data.role}`,
    after: { name: parsed.data.name, role: parsed.data.role },
  });

  revalidateTeam();
  redirect("/admin/team?created=1");
}

export async function updateTeamMemberAction(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const auth = await authorise("content.pages.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing team member id." };

  const before = await getTeamMember(id);
  if (!before.ok) return { error: before.error.message };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { error } = await supabase
    .from("team_members")
    .update({ ...toRow(parsed.data), updated_by: auth.viewer.id })
    .eq("id", id);

  if (error) return { error: fromPostgrestError(error, "Couldn't save those changes.").error.message };

  await recordAudit({
    viewer: auth.viewer,
    action: "team.updated",
    resourceType: "team_member",
    resourceId: id,
    summary: `Updated ${parsed.data.name}`,
    before: { name: before.data.name, role: before.data.role, status: before.data.status },
    after: { name: parsed.data.name, role: parsed.data.role, status: parsed.data.status },
  });

  revalidateTeam();
  redirect(`/admin/team?updated=1`);
}

/**
 * Archive rather than delete. The audit log references the row, and a removed
 * colleague is history rather than a mistake to erase.
 */
export async function archiveTeamMemberAction(formData: FormData): Promise<void> {
  const auth = await authorise("content.pages.manage");
  if (!auth.ok) redirect("/admin/team?error=forbidden");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/team?error=missing");

  const before = await getTeamMember(id);
  if (!before.ok) redirect("/admin/team?error=not_found");

  const supabase = await createClient();
  if (!supabase) redirect("/admin/team?error=unconfigured");

  await supabase
    .from("team_members")
    .update({ status: "archived", updated_by: auth.viewer.id })
    .eq("id", id);

  await recordAudit({
    viewer: auth.viewer,
    action: "team.archived",
    resourceType: "team_member",
    resourceId: id,
    summary: `Archived ${before.data.name}`,
    before: { status: before.data.status },
    after: { status: "archived" },
  });

  revalidateTeam();
  redirect("/admin/team?archived=1");
}
