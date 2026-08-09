import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRole, type Permission, type Role, can, isAdmin, isStaff } from "@/lib/auth/roles";

/**
 * Server-side session and authorisation.
 *
 * Everything here uses supabase.auth.getUser(), which revalidates the JWT with
 * the auth server. getSession() reads the cookie without verifying it and must
 * never be used for an access decision.
 */

export interface Viewer {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  roles: Role[];
  /** Set when this account is linked to a healer profile. */
  healerId: string | null;
  /** The linked healer's public slug, for revalidating their profile page. */
  healerSlug: string | null;
  status: "active" | "suspended" | "archived";
}

/** The signed-in user, or null. Never throws. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return null;

  const [{ data: profile }, { data: roleRows }, { data: healer }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, status, email").eq("id", auth.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("healers").select("id, slug").eq("user_id", auth.user.id).maybeSingle(),
  ]);

  const roles = (roleRows ?? [])
    .map((r) => r.role)
    .filter((r): r is Role => isRole(r));

  return {
    id: auth.user.id,
    email: profile?.email ?? auth.user.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    roles,
    healerId: healer?.id ?? null,
    healerSlug: healer?.slug ?? null,
    status: profile?.status ?? "active",
  };
}

/** For a page that must not render to a stranger. Redirects rather than throwing. */
export async function requireViewer(loginPath = "/signin"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(loginPath);
  if (viewer.status !== "active") redirect(`${loginPath}?reason=suspended`);
  return viewer;
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer("/admin/login");
  if (!isStaff(viewer.roles)) redirect("/admin/login?reason=forbidden");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin/login");
  if (!isAdmin(viewer.roles)) redirect("/admin/login?reason=forbidden");
  return viewer;
}

export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer("/admin/login");
  if (!can(viewer.roles, permission)) redirect("/admin/login?reason=forbidden");
  return viewer;
}

/** The healer portal. Returns the viewer plus their guaranteed healer id. */
export async function requireHealer(): Promise<Viewer & { healerId: string; healerSlug: string }> {
  const viewer = await requireViewer("/healer/login");
  if (!viewer.roles.includes("healer") || !viewer.healerId) {
    redirect("/healer/login?reason=forbidden");
  }
  // healerSlug is non-null whenever healerId is: both come from the same row.
  return viewer as Viewer & { healerId: string; healerSlug: string };
}

/**
 * For Route Handlers and Server Actions, where a redirect is the wrong answer.
 * Returns a discriminated result instead.
 */
export type AuthResult =
  | { ok: true; viewer: Viewer }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function authorise(permission?: Permission): Promise<AuthResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Supabase is not configured on this deployment." };
  }
  const viewer = await getViewer();
  if (!viewer) return { ok: false, status: 401, error: "Not signed in." };
  if (viewer.status !== "active") return { ok: false, status: 403, error: "This account is not active." };
  if (permission && !can(viewer.roles, permission)) {
    return { ok: false, status: 403, error: "You do not have permission to do that." };
  }
  return { ok: true, viewer };
}

/**
 * The healer actor for a mutation.
 *
 * Returns the healer id derived from the SESSION, never from a form field. Every
 * healer-scoped server action uses this rather than trusting a submitted id,
 * which is what makes "healer A cannot edit healer B" true at the application
 * layer as well as in RLS.
 *
 * Returns a Result rather than redirecting: a server action needs to answer the
 * caller, not navigate them.
 */
export type HealerActor =
  | { ok: true; viewer: Viewer; healerId: string; healerSlug: string }
  | { ok: false; error: string; status: 401 | 403 | 503 };

export async function requireHealerActor(): Promise<HealerActor> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "This deployment isn't configured yet." };
  }

  const viewer = await getViewer();
  if (!viewer) return { ok: false, status: 401, error: "Please sign in again." };
  if (viewer.status !== "active") {
    return { ok: false, status: 403, error: "This account is not active. Please contact HealerJi." };
  }
  if (!viewer.roles.includes("healer") || !viewer.healerId) {
    return { ok: false, status: 403, error: "This account isn't linked to a healer profile." };
  }

  return {
    ok: true,
    viewer,
    healerId: viewer.healerId,
    healerSlug: viewer.healerSlug ?? "",
  };
}
