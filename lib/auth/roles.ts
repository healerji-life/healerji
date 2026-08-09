/**
 * The permission matrix.
 *
 * This is the single place permissions are defined for the UI. It is NOT the
 * security boundary — that is Row Level Security in the database
 * (supabase/migrations/…_rls_policies.sql). This exists so screens can hide
 * what a person cannot do, and so server actions can fail fast with a good
 * message instead of a Postgres error.
 *
 * If these two ever disagree, the database wins. That is the point.
 */

export const ROLES = ["super_admin", "admin", "editor", "healer", "customer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  editor: "Editor",
  healer: "Healer",
  customer: "Customer",
};

export const PERMISSIONS = [
  "analytics.view",
  "analytics.export",
  "bookings.view.all",
  "bookings.view.own",
  "bookings.manage",
  "bookings.refund",
  "healers.view",
  "healers.manage",
  "healers.invite",
  "healers.import",
  "healer.profile.own",
  "healer.availability.own",
  "healer.sessions.own",
  "customers.view",
  "customers.export",
  "content.blog.manage",
  "content.blog.publish",
  "content.blog.import",
  "content.pages.manage",
  "content.practices.manage",
  "payments.view",
  "payments.export",
  "users.view",
  "users.manage",
  "roles.manage",
  "audit.view",
  "settings.view",
  "settings.manage",
  "account.own",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EDITOR: Permission[] = [
  "content.blog.manage",
  "content.blog.publish",
  "content.blog.import",
  "content.pages.manage",
  "content.practices.manage",
  "healers.view",
  "analytics.view",
  "settings.view",
  "account.own",
];

const ADMIN: Permission[] = [
  ...EDITOR,
  "analytics.export",
  "bookings.view.all",
  "bookings.manage",
  "bookings.refund",
  "healers.manage",
  "healers.invite",
  "healers.import",
  "customers.view",
  "customers.export",
  "payments.view",
  "payments.export",
  "users.view",
  "audit.view",
];

const HEALER: Permission[] = [
  "healer.profile.own",
  "healer.availability.own",
  "healer.sessions.own",
  "bookings.view.own",
  "account.own",
];

const CUSTOMER: Permission[] = ["bookings.view.own", "account.own"];

/**
 * Note what admin does NOT have: `users.manage`, `roles.manage`,
 * `settings.manage`. Creating administrators and changing platform settings is
 * reserved to super_admin, mirroring guard_role_changes() in the database.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  admin: ADMIN,
  editor: EDITOR,
  healer: HEALER,
  customer: CUSTOMER,
};

export function permissionsFor(roles: readonly Role[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) out.add(p);
  }
  return out;
}

export function can(roles: readonly Role[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}

export const isStaff = (roles: readonly Role[]): boolean =>
  roles.some((r) => r === "super_admin" || r === "admin" || r === "editor");

export const isAdmin = (roles: readonly Role[]): boolean =>
  roles.some((r) => r === "super_admin" || r === "admin");

export const isHealer = (roles: readonly Role[]): boolean => roles.includes("healer");

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
