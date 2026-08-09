import Link from "next/link";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/session";
import { can, ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { listUsers, getRoleCounts, type UserFilters } from "@/lib/services/users";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination, StatCard,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { RoleControls, StatusControls, InviteUserForm } from "@/components/admin/user-controls";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Users · HealerJi Operations" };
export const dynamic = "force-dynamic";

const ROLE_TONE: Record<Role, "brand" | "positive" | "warning" | "neutral"> = {
  super_admin: "brand",
  admin: "brand",
  editor: "positive",
  healer: "warning",
  customer: "neutral",
};

/**
 * Users and roles.
 *
 * Viewing requires `users.view` (admin and above). Changing anything requires
 * `roles.manage` / `users.manage`, which only super_admin holds — and the
 * database's guard_role_changes() refuses regardless of what this page renders,
 * including any attempt to alter your own roles.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewer = await requirePermission("users.view");
  const params = await searchParams;

  const filters: UserFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    ...(params.q ? { search: params.q } : {}),
    ...(params.role ? { role: params.role as UserFilters["role"] } : {}),
    ...(params.status ? { status: params.status as UserFilters["status"] } : {}),
  };

  const [result, counts] = await Promise.all([listUsers(filters), getRoleCounts()]);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/users${qs.toString() ? `?${qs.toString()}` : ""}`;

  const c = counts.ok ? counts.data : {};
  const canManage = can(viewer.roles, "roles.manage");

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Users"
        description="Accounts and what they can do. Role rules are enforced by the database, not by this screen."
      />

      <section aria-label="Role counts" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Super admins" value={c.super_admin ?? 0} />
        <StatCard label="Admins" value={c.admin ?? 0} />
        <StatCard label="Editors" value={c.editor ?? 0} />
        <StatCard label="Healers" value={c.healer ?? 0} />
        <StatCard label="Customers" value={c.customer ?? 0} />
      </section>

      {(c.super_admin ?? 0) === 0 ? (
        <p role="alert" className="mt-4 rounded-sm border-l-2 border-warning-700 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          There is no super admin. Role management and platform settings are
          locked until one exists — bootstrap one from the Supabase SQL editor
          (see supabase/README.md).
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-6">
          <Panel title="Invite a colleague" description="Admins and editors only. Healers are invited from the Healers screen.">
            <InviteUserForm origin={origin} />
          </Panel>
        </div>
      ) : (
        <p className="mt-6 rounded-sm bg-surface-50 px-4 py-3 text-sm text-ink-600 dark:bg-night-900 dark:text-mist-400">
          You can see accounts and roles. Changing them is reserved to a super admin.
        </p>
      )}

      <div className="mt-6">
        <FilterBar
          searchPlaceholder="Name or email…"
          filters={[
            {
              kind: "select", name: "role", label: "Any role",
              options: (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] })),
            },
            {
              kind: "select", name: "status", label: "Any status",
              options: [
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "archived", label: "Archived" },
              ],
            },
          ]}
        />
      </div>

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={qs.toString() ? "No accounts match those filters" : "No accounts yet"}
              description={
                qs.toString()
                  ? "Try clearing the role filter."
                  : "Accounts appear here as people sign up or are invited."
              }
            />
          </Panel>
        ) : (
          <Panel
            footer={
              <Pagination
                page={result.data.page}
                pageSize={result.data.pageSize}
                total={result.data.total}
                baseHref={baseHref}
              />
            }
          >
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Roles</Th>
                  <Th>Sign-in</Th>
                  <Th>Created</Th>
                  <Th>Last seen</Th>
                  <Th>Status</Th>
                  {canManage ? <Th align="right">Manage</Th> : null}
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((u) => {
                  const isSelf = u.id === viewer.id;
                  return (
                    <tr key={u.id} className="align-top transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface-100 dark:bg-night-800">
                            {u.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {u.fullName ?? "No name given"}
                              {isSelf ? <span className="ml-2 text-xs text-mist-500">you</span> : null}
                            </span>
                            <span className="block truncate text-xs text-mist-500">{u.email}</span>
                            {u.healerName ? (
                              <Link
                                href={`/admin/healers/${u.healerId}`}
                                className="block truncate text-xs underline underline-offset-2"
                              >
                                Healer: {u.healerName}
                              </Link>
                            ) : null}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-mist-500">none</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {u.roles.map((role) => (
                              <Badge key={role} tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
                            ))}
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs capitalize">{u.provider}</Td>
                      <Td className="text-xs text-mist-500">{formatDate(u.createdAt)}</Td>
                      <Td className="text-xs text-mist-500">
                        {u.lastSignInAt ? formatDate(u.lastSignInAt) : "Never"}
                      </Td>
                      <Td>
                        <Badge tone={u.status === "active" ? "positive" : u.status === "suspended" ? "critical" : "neutral"}>
                          {u.status}
                        </Badge>
                      </Td>
                      {canManage ? (
                        <Td align="right">
                          <div className="flex flex-col items-end gap-2">
                            <RoleControls userId={u.id} currentRoles={u.roles} isSelf={isSelf} />
                            <StatusControls userId={u.id} status={u.status} isSelf={isSelf} />
                          </div>
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>

      <p className="mt-4 text-xs text-mist-500">
        Nobody can change their own roles, and only a super admin can grant or
        revoke admin-level access — enforced by <code>guard_role_changes()</code> in
        the database, so it holds even if this page were bypassed entirely.
        Accounts are suspended, never deleted.
      </p>
    </>
  );
}
