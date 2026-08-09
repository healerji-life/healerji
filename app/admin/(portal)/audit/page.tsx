import { requirePermission } from "@/lib/auth/session";
import { listAuditLog, getAuditFacets, type AuditFilters } from "@/lib/services/audit";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Audit log · HealerJi Operations" };
export const dynamic = "force-dynamic";

/**
 * The audit log.
 *
 * Append-only at the database level: a trigger raises on UPDATE and DELETE, and
 * a second trigger strips anything key-shaped from the payload before insert. So
 * there is no edit control on this page — not because it was omitted, but
 * because the operation does not exist.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("audit.view");
  const params = await searchParams;

  const filters: AuditFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 40,
    ...(params.q ? { search: params.q } : {}),
    ...(params.actor ? { actor: params.actor } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.resource ? { resourceType: params.resource } : {}),
    ...(params.from ? { from: new Date(params.from).toISOString() } : {}),
    ...(params.to ? { to: new Date(`${params.to}T23:59:59`).toISOString() } : {}),
  };

  const [result, facets] = await Promise.all([listAuditLog(filters), getAuditFacets()]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/audit${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Audit log"
        description="Who changed what, and when. Append-only — these records cannot be edited or removed by anyone, including a super admin."
      />

      <FilterBar
        searchPlaceholder="Summary, actor email or resource id…"
        filters={[
          {
            kind: "select", name: "actor", label: "Any actor",
            options: (facets.ok ? facets.data.actors : []).map((a) => ({ value: a.id, label: a.email })),
          },
          {
            kind: "select", name: "action", label: "Any action",
            options: (facets.ok ? facets.data.actions : []).map((a) => ({ value: a, label: a })),
          },
          {
            kind: "select", name: "resource", label: "Any resource",
            options: (facets.ok ? facets.data.resourceTypes : []).map((r) => ({ value: r, label: r })),
          },
          { kind: "date", name: "from", label: "From" },
          { kind: "date", name: "to", label: "To" },
        ]}
      />

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={qs.toString() ? "Nothing matches those filters" : "No activity recorded yet"}
              description={
                qs.toString()
                  ? "Try widening the date range."
                  : "Healer edits, blog publishing, booking changes, role changes and sensitive exports are all recorded here as they happen."
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
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Resource</Th>
                  <Th>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap text-xs text-mist-500">
                      {formatDate(row.created_at, true)}
                    </Td>
                    <Td>
                      <span className="block text-sm">{row.actor_email ?? "System"}</span>
                      {row.actor_role ? (
                        <span className="block text-xs text-mist-500">{row.actor_role}</span>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge tone={row.action.includes("delet") || row.action.includes("archiv") ? "critical" : "neutral"}>
                        {row.action}
                      </Badge>
                    </Td>
                    <Td className="text-xs">
                      <span className="block">{row.resource_type}</span>
                      {row.resource_id ? (
                        <span className="block truncate font-mono text-mist-500">{row.resource_id}</span>
                      ) : null}
                    </Td>
                    <Td className="max-w-sm text-sm">{row.summary ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>

      <p className="mt-4 text-xs text-mist-500">
        Before/after payloads are stored on each record with credential-shaped keys
        redacted by a database trigger. They are not rendered here, to keep
        customer detail out of a screen that gets shared over someone&rsquo;s shoulder.
      </p>
    </>
  );
}
