import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  err, fromPostgrestError, NOT_CONFIGURED, ok, range, safeSort, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import { isRole, type Role } from "@/lib/auth/roles";
import type { AuthProvider } from "@/lib/supabase/types";

/**
 * Users and roles.
 *
 * This module reads and writes public.user_roles. It contains no permission
 * logic of its own — the rules live in guard_role_changes() in migration 0002,
 * which independently enforces:
 *
 *   · only an administrator may change any role
 *   · only a super_admin may grant or revoke admin / super_admin
 *   · nobody may modify their own roles, super_admin included
 *
 * So a bug here cannot produce privilege escalation: the database refuses with
 * SQLSTATE 42501 and the write fails.
 */

export const USER_SORT_COLUMNS = ["created_at", "last_sign_in_at", "email", "full_name"] as const;
export type UserSortColumn = (typeof USER_SORT_COLUMNS)[number];

export interface UserFilters extends ListParams {
  role?: Role | "all";
  status?: "active" | "suspended" | "archived" | "all";
}

export interface UserListRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  status: string;
  createdAt: string;
  lastSignInAt: string | null;
  roles: Role[];
  healerId: string | null;
  healerName: string | null;
}

export async function listUsers(filters: UserFilters = {}): Promise<Result<Paginated<UserListRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);
  const sort = safeSort<UserSortColumn>(filters.sort, USER_SORT_COLUMNS, "created_at");

  // Role is stored in a child table, so a role filter needs the ids first.
  let restrictToIds: string[] | null = null;
  if (filters.role && filters.role !== "all") {
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles").select("user_id").eq("role", filters.role);
    if (roleError) return fromPostgrestError(roleError);
    restrictToIds = (roleRows ?? []).map((r) => r.user_id);
    if (restrictToIds.length === 0) return ok({ rows: [], total: 0, page, pageSize });
  }

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, auth_provider, status, created_at, last_sign_in_at", {
      count: "exact",
    })
    .order(sort, { ascending: (filters.direction ?? "desc") === "asc" })
    .range(from, to);

  if (restrictToIds) query = query.in("id", restrictToIds);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const term = sanitiseSearch(filters.search);
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load users.");

  const profiles = data ?? [];
  if (profiles.length === 0) return ok({ rows: [], total: count ?? 0, page, pageSize });

  const ids = profiles.map((p) => p.id);
  const [{ data: roles }, { data: healers }] = await Promise.all([
    supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    supabase.from("healers").select("id, name, user_id").in("user_id", ids),
  ]);

  const roleMap = new Map<string, Role[]>();
  for (const row of roles ?? []) {
    if (!isRole(row.role)) continue;
    roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role]);
  }
  const healerMap = new Map((healers ?? []).map((h) => [h.user_id as string, h]));

  return ok({
    rows: profiles.map((p) => {
      const healer = healerMap.get(p.id);
      return {
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        provider: p.auth_provider,
        status: p.status,
        createdAt: p.created_at,
        lastSignInAt: p.last_sign_in_at,
        roles: roleMap.get(p.id) ?? [],
        healerId: healer?.id ?? null,
        healerName: healer?.name ?? null,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  });
}

/** Counts of each role, so the UI can warn before removing the last super_admin. */
export async function getRoleCounts(): Promise<Result<Record<string, number>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.from("user_roles").select("role");
  if (error) return fromPostgrestError(error);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.role] = (counts[row.role] ?? 0) + 1;
  return ok(counts);
}

/**
 * Grants a role.
 *
 * Uses the SESSION-scoped client, not the service role, deliberately: the
 * service role bypasses RLS and would also bypass guard_role_changes()'s
 * auth.uid() checks, silently permitting self-escalation. Routing this through
 * the caller's own session is what keeps the trigger meaningful.
 */
export async function grantRole(userId: string, role: Role): Promise<Result<null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) {
    if (error.code === "23505") return ok(null);   // already has it
    if (error.code === "42501") {
      return err("forbidden", "Only a super admin can grant that role, and nobody can change their own.");
    }
    return fromPostgrestError(error, "We couldn't grant that role.");
  }
  return ok(null);
}

export async function revokeRole(userId: string, role: Role): Promise<Result<null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error } = await supabase
    .from("user_roles").delete().eq("user_id", userId).eq("role", role);

  if (error) {
    if (error.code === "42501") {
      return err("forbidden", "Only a super admin can revoke that role, and nobody can change their own.");
    }
    return fromPostgrestError(error, "We couldn't revoke that role.");
  }
  return ok(null);
}

/** Suspend or reactivate. Accounts are never deleted (requirement 60). */
export async function setUserStatus(
  userId: string,
  status: "active" | "suspended" | "archived"
): Promise<Result<null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error } = await supabase
    .from("profiles")
    .update({ status, ...(status === "archived" ? { archived_at: new Date().toISOString() } : {}) })
    .eq("id", userId);

  if (error) {
    if (error.code === "42501") return err("forbidden", "You do not have permission to change that account.");
    return fromPostgrestError(error, "We couldn't update that account.");
  }
  return ok(null);
}

/**
 * Invites a staff user by email.
 *
 * Needs the service role because it calls the Auth admin API. The role grant
 * that follows deliberately does NOT: it goes through the caller's session so
 * guard_role_changes() still applies.
 */
export async function inviteUser(
  email: string,
  redirectTo: string
): Promise<Result<{ userId: string }>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data?.user) {
    return err("upstream", "We couldn't send that invitation.", error?.message);
  }
  return ok({ userId: data.user.id });
}
