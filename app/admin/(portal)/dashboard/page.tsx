import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { resolveRange, previousRange, type RangePreset } from "@/lib/services/analytics";
import {
  getDashboardSummary, getDailySeries, getTopHealers, getTopArticles,
} from "@/lib/services/dashboard";
import { listBookings } from "@/lib/services/bookings";
import { integrationStatuses } from "@/lib/services/integrations";
import { PageHeader, Panel, StatCard, EmptyState, ErrorState, Badge, Table, Th, Td } from "@/components/admin/ui";
import { BarChart, RankBars } from "@/components/admin/chart";
import { RangeTabs } from "@/components/admin/range-tabs";
import { formatPaise, formatNumber, formatDate, formatPercent, formatDuration } from "@/lib/format";

export const metadata = { title: "Overview · HealerJi Operations" };
export const dynamic = "force-dynamic";

const PRESETS: RangePreset[] = ["today", "7d", "30d", "90d", "ytd"];

function pctChange(current: number, previous: number): { pct: number; label: string } | null {
  if (previous === 0) return null;   // no baseline: a percentage would be meaningless
  return { pct: ((current - previous) / previous) * 100, label: "vs previous period" };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const viewer = await requireStaff();
  const params = await searchParams;

  const preset: RangePreset = PRESETS.includes(params.range as RangePreset)
    ? (params.range as RangePreset)
    : "30d";
  const range = resolveRange(preset);
  const prior = previousRange(range);

  const [summary, priorSummary, series, topHealers, topArticles, recent] = await Promise.all([
    getDashboardSummary(range),
    getDashboardSummary(prior),
    getDailySeries(range),
    getTopHealers(range, 5),
    getTopArticles(range, 5),
    can(viewer.roles, "bookings.view.all")
      ? listBookings({ pageSize: 8, sort: "created_at", direction: "desc" })
      : Promise.resolve(null),
  ]);

  if (!summary.ok) {
    return (
      <>
        <PageHeader eyebrow="HealerJi Operations" title="Overview" />
        <ErrorState
          message={summary.error.message}
          detail={
            summary.error.code === "not_configured"
              ? "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload."
              : undefined
          }
        />
      </>
    );
  }

  const s = summary.data;
  const p = priorSummary.ok ? priorSummary.data : null;
  const points = series.ok ? series.data : [];
  const unconfigured = integrationStatuses().filter((i) => !i.configured);

  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <>
      <PageHeader
        eyebrow="HealerJi Operations"
        title="Overview"
        description={`${formatDate(range.from)} — ${formatDate(range.to)}`}
        actions={<RangeTabs basePath="/admin/dashboard" current={preset} />}
      />

      {/* ------------------------------------------------------------- cards */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Net revenue"
          value={s.paymentsCaptured === 0 ? null : formatPaise(s.netRevenuePaise, { compact: true })}
          delta={p ? pctChange(s.netRevenuePaise, p.netRevenuePaise) : null}
          hint={s.paymentsCaptured === 0 ? undefined : `${formatNumber(s.paymentsCaptured)} payments`}
        />
        <StatCard
          label="Bookings"
          value={s.bookings}
          delta={p ? pctChange(s.bookings, p.bookings) : null}
          hint={s.bookingsCancelled > 0 ? `${s.bookingsCancelled} cancelled` : undefined}
        />
        <StatCard
          label="Active healers"
          value={s.activeHealers}
          hint={`${s.healersAccepting} accepting bookings`}
        />
        <StatCard
          label="Customers"
          value={s.customersTotal}
          hint={s.customersNew > 0 ? `${s.customersNew} new this period` : "No new sign-ups"}
        />
        <StatCard
          label="Visitors"
          value={s.visitors === 0 ? null : formatNumber(s.visitors)}
          delta={p ? pctChange(s.visitors, p.visitors) : null}
          hint={s.visitors === 0 ? undefined : `${formatNumber(s.pageViews)} page views`}
        />
        <StatCard
          label="Conversion"
          value={s.conversionRate === null ? null : formatPercent(s.conversionRate, 2)}
          hint={s.conversionRate === null ? undefined : "Bookings ÷ visitors"}
        />
      </section>

      {/* ------------------------------------------------------------ charts */}
      <section aria-label="Trends" className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue" description="Captured payments, net of refunds.">
          <div className="px-6 pb-5 pt-4">
            <BarChart
              data={points.map((pt) => ({ label: dayLabel(pt.day), value: pt.revenuePaise }))}
              format={(v) => formatPaise(v, { compact: true })}
              emptyMessage="No payments captured in this period."
              accent="plum"
            />
          </div>
        </Panel>

        <Panel title="Bookings" description="Confirmed and completed sessions.">
          <div className="px-6 pb-5 pt-4">
            <BarChart
              data={points.map((pt) => ({ label: dayLabel(pt.day), value: pt.bookings }))}
              emptyMessage="No bookings in this period."
            />
          </div>
        </Panel>

        <Panel
          title="Website traffic"
          description={
            s.avgEngagementMs === null
              ? "No analytics events recorded yet."
              : `Average engagement ${formatDuration(s.avgEngagementMs)} · scroll ${formatPercent(s.avgScrollPct)}`
          }
        >
          <div className="px-6 pb-5 pt-4">
            <BarChart
              data={points.map((pt) => ({ label: dayLabel(pt.day), value: pt.visitors }))}
              emptyMessage="No traffic recorded. Analytics ingestion may not be wired into the public site yet."
            />
          </div>
        </Panel>

        <Panel title="Top healers" description="By revenue in this period.">
          <RankBars
            data={(topHealers.ok ? topHealers.data : []).map((h) => ({
              label: h.name,
              value: h.revenue_paise,
              caption: `${formatNumber(h.bookings)} bookings · ${formatNumber(h.profile_views)} profile views`,
            }))}
            format={(v) => formatPaise(v, { compact: true })}
            emptyMessage="No bookings attributed to a healer yet."
          />
        </Panel>
      </section>

      {/* ------------------------------------------------------------ tables */}
      <section aria-label="Recent activity" className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Recent bookings"
          footer={
            can(viewer.roles, "bookings.view.all") ? (
              <Link href="/admin/bookings" className="text-sm underline underline-offset-4">
                All bookings
              </Link>
            ) : null
          }
        >
          {!recent ? (
            <p className="px-6 py-10 text-sm text-mist-500">
              Your role does not include booking access.
            </p>
          ) : !recent.ok ? (
            <p className="px-6 py-10 text-sm text-error-700">{recent.error.message}</p>
          ) : recent.data.rows.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              description="Once a customer completes payment, the confirmed session appears here."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Customer</Th>
                  <Th>Session</Th>
                  <Th>Status</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {recent.data.rows.map((b) => (
                  <tr key={b.id}>
                    <Td className="font-mono text-xs">{b.reference}</Td>
                    <Td>{b.guest_name ?? "HealerJi member"}</Td>
                    <Td>
                      <span className="capitalize">{b.session_kind}</span>{" "}
                      <span className="text-mist-500">· {formatDate(b.starts_at, true)}</span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          b.status === "confirmed" || b.status === "completed" ? "positive"
                            : b.status === "cancelled" || b.status === "no_show" ? "critical"
                            : "warning"
                        }
                      >
                        {b.status.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td align="right">{formatPaise(b.amount_paise)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Top blogs" description="By page views.">
            <RankBars
              data={(topArticles.ok ? topArticles.data : []).map((a) => ({
                label: a.title,
                value: a.views,
                caption: `${formatNumber(a.visitors)} visitors`,
              }))}
              format={formatNumber}
              emptyMessage="No blog traffic recorded yet."
            />
          </Panel>

          {unconfigured.length > 0 ? (
            <Panel title="Needs configuration">
              <ul className="divide-y divide-mist-200/50 dark:divide-night-800/70">
                {unconfigured.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <span className="min-w-0 truncate text-sm">{i.label}</span>
                    <Badge tone="neutral">Not configured</Badge>
                  </li>
                ))}
              </ul>
              <div className="border-t border-mist-200/70 px-6 py-3 dark:border-night-800">
                <Link href="/admin/settings" className="text-sm underline underline-offset-4">
                  Integration settings
                </Link>
              </div>
            </Panel>
          ) : null}
        </div>
      </section>
    </>
  );
}
