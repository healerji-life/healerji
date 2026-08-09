import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listCustomers, type CustomerFilters } from "@/lib/services/customers";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { ExportButtons } from "@/components/admin/export-buttons";
import { formatPaise, formatDate } from "@/lib/format";

export const metadata = { title: "Customers · HealerJi Operations" };
export const dynamic = "force-dynamic";

/**
 * Customers.
 *
 * Requires the admin role, not merely staff — an editor has no business reading
 * the customer list, and the RLS policy on profiles enforces that independently.
 *
 * Note what is absent: no provider account identifiers, no tokens, no
 * authentication metadata beyond which method someone signs in with.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("customers.view");
  const params = await searchParams;

  const filters: CustomerFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    ...(params.q ? { search: params.q } : {}),
    ...(params.provider ? { provider: params.provider as CustomerFilters["provider"] } : {}),
    ...(params.status ? { status: params.status as CustomerFilters["status"] } : {}),
  };

  const result = await listCustomers(filters);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/customers${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Customers"
        description="Everyone with an account. Spend counts money actually captured, not quoted."
        actions={<ExportButtons dataset="customers" query={qs.toString()} />}
      />

      <FilterBar
        searchPlaceholder="Name or email…"
        filters={[
          {
            kind: "select", name: "provider", label: "Any sign-in method",
            options: [
              { value: "email", label: "Email and password" },
              { value: "google", label: "Google" },
              { value: "apple", label: "Apple" },
              { value: "phone", label: "Phone" },
            ],
          },
          {
            kind: "select", name: "status", label: "Any account status",
            options: [
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
      />

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={qs.toString() ? "No customers match those filters" : "No customers yet"}
              description={
                qs.toString()
                  ? "Try clearing the sign-in method filter."
                  : "Accounts appear here as people sign up. Guest bookings are recorded against the booking, and link to an account when that person signs in with the same email."
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
                  <Th>Customer</Th>
                  <Th>Sign-in</Th>
                  <Th>Registered</Th>
                  <Th>Last seen</Th>
                  <Th align="right">Bookings</Th>
                  <Th align="right">Upcoming</Th>
                  <Th align="right">Total paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                    <Td>
                      <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3">
                        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface-100 dark:bg-night-800">
                          {c.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {c.fullName ?? "No name given"}
                          </span>
                          <span className="block truncate text-xs text-mist-500">{c.email}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="capitalize">{c.provider}</Td>
                    <Td className="text-xs text-mist-500">{formatDate(c.createdAt)}</Td>
                    <Td className="text-xs text-mist-500">
                      {c.lastSignInAt ? formatDate(c.lastSignInAt) : "Never"}
                    </Td>
                    <Td align="right">{c.bookingCount}</Td>
                    <Td align="right">{c.upcomingCount}</Td>
                    <Td align="right">
                      {c.totalSpendPaise > 0 ? formatPaise(c.totalSpendPaise) : "—"}
                    </Td>
                    <Td>
                      <Badge tone={c.status === "active" ? "positive" : "neutral"}>{c.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>
    </>
  );
}
