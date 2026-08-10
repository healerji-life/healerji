"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/site-url";
import { grantRole, revokeRole, setUserStatus, inviteUser, getRoleCounts } from "@/lib/services/users";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import { isRole, type Role } from "@/lib/auth/roles";

/**
 * User and role mutations.
 *
 * Three layers, each independent:
 *
 *   1. authorise("roles.manage") — only super_admin holds that permission in the
 *      matrix, so an ordinary admin is refused here.
 *   2. The explicit self-target check below.
 *   3. guard_role_changes() in the database, which refuses any role write where
 *      auth.uid() equals the target, or where a non-super_admin touches an
 *      admin-level role. This is the layer that actually cannot be bypassed.
 *
 * A note on why (2) exists at all given (3): the trigger returns a Postgres
 * error, and turning that into a useful sentence for an operator is easier here.
 * It is a message, not a control.
 */

export interface UserActionState {
  error?: string;
  notice?: string;
}

export async function changeUserRoleAction(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const auth = await authorise("roles.manage");
  if (!auth.ok) {
    return {
      error:
        auth.status === 403
          ? "Only a super admin can change roles."
          : auth.error,
    };
  }

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const mode = String(formData.get("mode") ?? "grant");

  if (!z.string().uuid().safeParse(userId).success) return { error: "That account could not be found." };
  if (!isRole(role)) return { error: "That is not a valid role." };

  if (userId === auth.viewer.id) {
    return { error: "You cannot change your own roles. Ask another super admin." };
  }

  // Refuse to remove the last super_admin — that would lock everyone out of
  // role management permanently, and no database constraint covers it.
  if (mode === "revoke" && role === "super_admin") {
    const counts = await getRoleCounts();
    if (counts.ok && (counts.data.super_admin ?? 0) <= 1) {
      return { error: "This is the only super admin. Grant the role to someone else first." };
    }
  }

  const result = mode === "revoke" ? await revokeRole(userId, role as Role) : await grantRole(userId, role as Role);
  if (!result.ok) return { error: result.error.message };

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.roleChanged,
    resourceType: "user_role",
    resourceId: userId,
    summary: `${mode === "revoke" ? "Revoked" : "Granted"} ${role}`,
    after: { role, mode },
  });

  revalidatePath("/admin/users");
  return { notice: `${mode === "revoke" ? "Revoked" : "Granted"} ${role.replace("_", " ")}.` };
}

export async function setUserStatusAction(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const auth = await authorise("users.manage");
  if (!auth.ok) {
    return { error: auth.status === 403 ? "Only a super admin can suspend accounts." : auth.error };
  }

  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!z.string().uuid().safeParse(userId).success) return { error: "That account could not be found." };
  if (!["active", "suspended", "archived"].includes(status)) return { error: "Unknown status." };

  if (userId === auth.viewer.id) {
    return { error: "You cannot change your own account status." };
  }

  const result = await setUserStatus(userId, status as "active" | "suspended" | "archived");
  if (!result.ok) return { error: result.error.message };

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.userSuspended,
    resourceType: "profile",
    resourceId: userId,
    summary: `Account set to ${status}`,
    after: { status },
  });

  revalidatePath("/admin/users");
  return {
    notice:
      status === "active"
        ? "Account reactivated."
        : "Account suspended. They can no longer sign in to any portal.",
  };
}

export async function inviteUserAction(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const auth = await authorise("users.manage");
  if (!auth.ok) {
    return { error: auth.status === 403 ? "Only a super admin can invite users." : auth.error };
  }

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "editor");

  if (!z.string().email().safeParse(email).success) return { error: "That email doesn't look right." };
  if (!isRole(role)) return { error: "That is not a valid role." };
  if (role === "healer") {
    return { error: "Invite healers from the Healers screen, so the account is linked to their profile." };
  }

  // As with healers: the invited account has no password until they set one.
  const afterInvite = `/account/password?next=${encodeURIComponent("/admin/dashboard")}`;
  const invited = await inviteUser(
    email,
    await absoluteUrl(`/auth/callback?next=${encodeURIComponent(afterInvite)}`)
  );
  if (!invited.ok) {
    return {
      error:
        invited.error.code === "not_configured"
          ? "Invitations need SUPABASE_SERVICE_ROLE_KEY. Add it and redeploy."
          : invited.error.message,
    };
  }

  // Granted through the caller's own session, so the trigger still applies.
  const granted = await grantRole(invited.data.userId, role as Role);

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.roleChanged,
    resourceType: "user_role",
    resourceId: invited.data.userId,
    summary: `Invited ${email} as ${role}`,
    after: { email, role },
  });

  revalidatePath("/admin/users");

  if (!granted.ok) {
    return {
      error: `Invitation sent to ${email}, but the ${role} role was not granted: ${granted.error.message}`,
    };
  }
  return {
    notice: `Invitation sent to ${email}. They choose their own password — you will never see it.`,
  };
}
