import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listBookings, type BookingFilters } from "@/lib/services/bookings";
import { listHealersForAdmin } from "@/lib/services/healers";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { ExportButtons } from "@/components/admin/export-buttons";
import { formatPaise, formatDate } from "@/lib/format";

export const metadata = { title: "Bookings · HealerJi Operations" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "positive" | "warning" | "critical" | "neutral"> = {
  confirmed: "positive",
  completed: "positive",
  pending_payment: "warning",
  cancelled: "critical",
  no_show: "critical",
  expired: "neutral",
};

const PAYMENT_TONE: Record<string, "positive" | "warning" | "critical" | "neutral"> = {
  paid: "positive",
  unpaid: "neutral",
  processing: "warning",
  failed: "critical",
  refunded: "neutral",
  partially_refunded: "warning",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("bookings.view.all");
  const params = await searchParams;

  const filters: BookingFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    ...(params.q ? { search: params.q } : {}),
    ...(params.status ? { status: params.status as BookingFilters["status"] } : {}),
    ...(params.payment ? { paymentStatus: params.payment as BookingFilters["paymentStatus"] } : {}),
    ...(params.healer ? { healerId: params.healer } : {}),
    ...(params.kind ? { sessionKind: params.kind as BookingFilters["sessionKind"] } : {}),
    ...(params.from ? { from: new Date(params.from).toISOString() } : {}),
    ...(params.to ? { to: new Date(`${params.to}T23:59:59`).toISOString() } : {}),
  };

  const [result, healers] = await Promise.all([
    listBookings(filters),
    listHealersForAdmin({ pageSize: 200, status: "all" }),
  ]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/bookings${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        description="Every session, whatever its payment state. A booking becomes confirmed only when a verified payment is captured."
        actions={<ExportButtons dataset="bookings" query={qs.toString()} />}
      />

      <FilterBar
        searchPlaceholder="Reference, customer name or email…"
        filters={[
          {
            kind: "select", name: "status", label: "All statuses",
            options: [
              { value: "confirmed", label: "Confirmed" },
              { value: "completed", label: "Completed" },
              { value: "pending_payment", label: "Awaiting payment" },
              { value: "cancelled", label: "Cancelled" },
              { value: "no_show", label: "No show" },
              { value: "expired", label: "Expired hold" },
            ],
          },
          {
            kind: "select", name: "payment", label: "Any payment state",
            options: [
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid" },
              { value: "failed", label: "Failed" },
              { value: "refunded", label: "Refunded" },
              { value: "partially_refunded", label: "Partly refunded" },
            ],
          },
          {
            kind: "select", name: "healer", label: "All healers",
            options: (healers.ok ? healers.data.rows : []).map((h) => ({ value: h.id, label: h.name })),
          },
          {
            kind: "select", name: "kind", label: "Any session type",
            options: [
              { value: "chat", label: "Chat" },
              { value: "audio", label: "Audio" },
              { value: "video", label: "Video" },
            ],
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
              title={qs.toString() ? "Nothing matches those filters" : "No bookings yet"}
              description={
                qs.toString()
                  ? "Try widening the date range or clearing the status filter."
                  : "Bookings will appear here once customers begin scheduling sessions. Each one arrives with its payment record attached."
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
                  <Th>Reference</Th>
                  <Th>Customer</Th>
                  <Th>Session</Th>
                  <Th>When</Th>
                  <Th align="right">Amount</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                    <Td>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {b.reference}
                      </Link>
                    </Td>
                    <Td>{b.guest_name ?? "HealerJi member"}</Td>
                    <Td className="capitalize">
                      {b.session_kind} · {b.duration_minutes}m
                    </Td>
                    <Td>{formatDate(b.starts_at, true)}</Td>
                    <Td align="right">{formatPaise(b.amount_paise)}</Td>
                    <Td>
                      <Badge tone={PAYMENT_TONE[b.payment_status] ?? "neutral"}>
                        {b.payment_status.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[b.status] ?? "neutral"}>
                        {b.status.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-mist-500">{formatDate(b.created_at)}</Td>
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
