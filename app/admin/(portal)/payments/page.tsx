import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listPayments, getPaymentSummary, type PaymentFilters } from "@/lib/services/payments";
import { integrationStatuses } from "@/lib/services/integrations";
import {
  PageHeader, Panel, StatCard, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { ExportButtons } from "@/components/admin/export-buttons";
import { formatPaise, formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Payments · HealerJi Operations" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "positive" | "warning" | "critical" | "neutral"> = {
  captured: "positive",
  created: "warning",
  authorized: "warning",
  failed: "critical",
  refunded: "neutral",
  partially_refunded: "warning",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("payments.view");
  const params = await searchParams;

  const filters: PaymentFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    ...(params.q ? { search: params.q } : {}),
    ...(params.status ? { status: params.status as PaymentFilters["status"] } : {}),
    ...(params.from ? { from: new Date(params.from).toISOString() } : {}),
    ...(params.to ? { to: new Date(`${params.to}T23:59:59`).toISOString() } : {}),
  };

  const [summary, result] = await Promise.all([
    getPaymentSummary({
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    listPayments(filters),
  ]);

  const razorpay = integrationStatuses().find((i) => i.id === "razorpay");

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/payments${qs.toString() ? `?${qs.toString()}` : ""}`;

  const s = summary.ok ? summary.data : null;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Payments"
        description="Our own verified ledger. These figures come from records this server wrote after checking a Razorpay signature — not from a live API call."
        actions={<ExportButtons dataset="payments" query={qs.toString()} />}
      />

      {razorpay && !razorpay.configured ? (
        <div className="mb-4 rounded-lg border-l-2 border-mist-300 bg-white p-5 shadow-e-1 dark:bg-night-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Razorpay is not configured.</p>
              <p className="mt-0.5 text-sm text-ink-600 dark:text-mist-400">
                No payments can be taken yet, so this ledger will stay empty.
                Missing: {razorpay.missing.join(", ")}.
              </p>
            </div>
            <Badge tone="neutral">Not configured</Badge>
          </div>
        </div>
      ) : null}

      <section aria-label="Payment totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Net revenue"
          value={s === null || s.captured === 0 ? null : formatPaise(s.netPaise, { compact: true })}
          hint={s && s.refundedPaise > 0 ? `${formatPaise(s.refundedPaise, { compact: true })} refunded` : undefined}
        />
        <StatCard label="Successful" value={s?.captured ?? null} />
        <StatCard
          label="Failed"
          value={s?.failed ?? null}
          hint={s && s.captured + s.failed > 0
            ? `${((s.failed / (s.captured + s.failed)) * 100).toFixed(1)}% of attempts`
            : undefined}
        />
        <StatCard label="Refunds" value={s?.refunds ?? null} />
        <StatCard
          label="Average transaction"
          value={s?.averagePaise === null || s?.averagePaise === undefined ? null : formatPaise(s.averagePaise)}
          hint={s?.averagePaise === null ? "No captured payments to average" : undefined}
        />
      </section>

      <div className="mt-6">
        <FilterBar
          searchPlaceholder="Razorpay order or payment ID…"
          filters={[
            {
              kind: "select", name: "status", label: "All statuses",
              options: [
                { value: "captured", label: "Captured" },
                { value: "created", label: "Created (unpaid)" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
                { value: "partially_refunded", label: "Partly refunded" },
              ],
            },
            { kind: "date", name: "from", label: "From" },
            { kind: "date", name: "to", label: "To" },
          ]}
        />
      </div>

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={qs.toString() ? "No payments match those filters" : "No payments yet"}
              description={
                qs.toString()
                  ? "Try widening the date range."
                  : "Every verified payment appears here with its Razorpay identifiers, the booking it belongs to, and how it was verified."
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
                  <Th>Payment ID</Th>
                  <Th>Order ID</Th>
                  <Th>Booking</Th>
                  <Th>Healer</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Verified</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                    <Td className="font-mono text-xs">{p.razorpayPaymentId ?? "—"}</Td>
                    <Td className="font-mono text-xs">{p.razorpayOrderId}</Td>
                    <Td>
                      {p.bookingId ? (
                        <Link
                          href={`/admin/bookings/${p.bookingId}`}
                          className="font-mono text-xs underline-offset-4 hover:underline"
                        >
                          {p.bookingReference}
                        </Link>
                      ) : (
                        <span className="text-mist-500">—</span>
                      )}
                    </Td>
                    <Td>{p.healerName ?? "—"}</Td>
                    <Td align="right">
                      {formatPaise(p.amountPaise)}
                      {p.amountRefundedPaise > 0 ? (
                        <span className="block text-xs text-mist-500">
                          −{formatPaise(p.amountRefundedPaise)}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-mist-500">{p.verifiedVia ?? "—"}</Td>
                    <Td className="text-xs text-mist-500">
                      {formatDate(p.capturedAt ?? p.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>

      {s && s.captured > 0 ? (
        <p className="mt-4 text-xs text-mist-500">
          Gross {formatPaise(s.grossPaise)} across {formatNumber(s.captured)} captured payments.
          Net is gross less refunds recorded against those payments.
        </p>
      ) : null}
    </>
  );
}
