import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { resolveRange, previousRange, supabaseAnalytics, type RangePreset } from "@/lib/services/analytics";
import {
  getDashboardSummary, getDailySeries, getTopHealers, getTopArticles, getEventTotals,
} from "@/lib/services/dashboard";
import { integrationStatuses } from "@/lib/services/integrations";
import {
  PageHeader, Panel, StatCard, Table, Th, Td, EmptyState, ErrorState,
} from "@/components/admin/ui";
import { BarChart, RankBars } from "@/components/admin/chart";
import { RangeTabs } from "@/components/admin/range-tabs";
import { EVENT_LABEL, type AnalyticsEventName } from "@/lib/analytics/events";
import { formatNumber, formatPaise, formatPercent, formatDuration, formatDate } from "@/lib/format";

export const metadata = { title: "Analytics · HealerJi Operations" };
export const dynamic = "force-dynamic";

const PRESETS: RangePreset[] = ["today", "7d", "30d", "90d", "ytd"];

/**
 * Analytics.
 *
 * Every number comes from the first-party tables via the SECURITY DEFINER
 * functions in migration 0012, each of which enforces is_staff() inside the
 * database. Nothing here is modelled, extrapolated or filled in.
 *
 * When a metric has no underlying rows the card says "No data yet" rather than
 * rendering a zero, because an operator reading "0 visitors" needs to know
 * whether that means nobody came or nothing is being recorded.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; device?: string }>;
}) {
  await requirePermission("analytics.view");
  const params = await searchParams;

  const preset: RangePreset = PRESETS.includes(params.range as RangePreset)
    ? (params.range as RangePreset)
    : "30d";
  const range = resolveRange(preset);
  const prior = previousRange(range);
  const device = params.device && params.device !== "all" ? params.device : undefined;

  const [summary, priorSummary, series, pages, topHealers, topArticles, events] = await Promise.all([
    getDashboardSummary(range),
    getDashboardSummary(prior),
    getDailySeries(range),
    supabaseAnalytics.getPageEngagement(range, device),
    getTopHealers(range, 8),
    getTopArticles(range, 8),
    getEventTotals(range),
  ]);

  if (!summary.ok) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Analytics" />
        <ErrorState
          message={summary.error.message}
          detail={
            summary.error.code === "forbidden"
              ? "Analytics is restricted to staff. The database refused this query."
              : undefined
          }
        />
      </>
    );
  }

  const s = summary.data;
  const p = priorSummary.ok ? priorSummary.data : null;
  const points = series.ok ? series.data : [];
  const pageRows = pages.ok ? pages.data : [];
  const eventRows = events.ok ? events.data : [];
  const ga = integrationStatuses().find((i) => i.id === "google_analytics");

  const delta = (current: number, previous: number | undefined) =>
    previous === undefined || previous === 0 ? null
      : { pct: ((current - previous) / previous) * 100, label: "vs previous period" };

  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const noTraffic = s.pageViews === 0;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Analytics"
        description={`${formatDate(range.from)} — ${formatDate(range.to)}`}
        actions={<RangeTabs basePath="/admin/analytics" current={preset} {...(device ? { extraParams: { device } } : {})} />}
      />

      {noTraffic ? (
        <div className="mb-4 rounded-lg border-l-2 border-mist-300 bg-white p-5 shadow-e-1 dark:bg-night-900">
          <p className="font-medium">No traffic recorded in this period.</p>
          <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
            The analytics tables are empty. Events are ingested server-side through{" "}
            <code className="text-xs">/api/analytics/collect</code>, which requires{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> and the tracker
            wired into the public layout. Until then every figure below will read
            &ldquo;No data yet&rdquo; — which is the truth, not a failure.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------- headline */}
      <section aria-label="Audience" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Visitors"
          value={s.visitors === 0 ? null : formatNumber(s.visitors)}
          delta={p ? delta(s.visitors, p.visitors) : null}
        />
        <StatCard
          label="Page views"
          value={s.pageViews === 0 ? null : formatNumber(s.pageViews)}
          delta={p ? delta(s.pageViews, p.pageViews) : null}
        />
        <StatCard
          label="Sessions"
          value={s.sessions === 0 ? null : formatNumber(s.sessions)}
        />
        <StatCard
          label="Avg engagement"
          value={s.avgEngagementMs === null ? null : formatDuration(s.avgEngagementMs)}
          hint={s.avgScrollPct === null ? undefined : `${formatPercent(s.avgScrollPct)} scroll depth`}
        />
      </section>

      <section aria-label="Commercial" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bookings"
          value={s.bookings}
          delta={p ? delta(s.bookings, p.bookings) : null}
        />
        <StatCard
          label="Revenue"
          value={s.paymentsCaptured === 0 ? null : formatPaise(s.netRevenuePaise, { compact: true })}
          delta={p ? delta(s.netRevenuePaise, p.netRevenuePaise) : null}
        />
        <StatCard
          label="Conversion"
          value={s.conversionRate === null ? null : formatPercent(s.conversionRate, 2)}
          hint={s.conversionRate === null ? "Not enough data" : "Bookings ÷ visitors"}
        />
        <StatCard
          label="Upcoming sessions"
          value={s.upcomingSessions}
        />
      </section>

      {/* --------------------------------------------------------- charts */}
      <section aria-label="Trends" className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Traffic" description="Unique visitors per day.">
          <div className="px-6 pb-5 pt-4">
            <BarChart
              data={points.map((pt) => ({ label: dayLabel(pt.day), value: pt.visitors }))}
              format={formatNumber}
              emptyMessage="No visitors recorded in this period."
            />
          </div>
        </Panel>

        <Panel title="Bookings" description="Confirmed and completed, by day created.">
          <div className="px-6 pb-5 pt-4">
            <BarChart
              data={points.map((pt) => ({ label: dayLabel(pt.day), value: pt.bookings }))}
              emptyMessage="No bookings in this period."
            />
          </div>
        </Panel>

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

        <Panel
          title="Conversion"
          description="Bookings per 100 visitors, by day."
        >
          <div className="px-6 pb-5 pt-4">
            <BarChart
              data={points.map((pt) => ({
                label: dayLabel(pt.day),
                // Days with no visitors contribute 0 rather than a divide-by-zero
                // spike, which would misread as a great day.
                value: pt.visitors > 0 ? Math.round((pt.bookings / pt.visitors) * 10000) / 100 : 0,
              }))}
              format={(v) => `${v}%`}
              emptyMessage="Not enough data to show conversion."
            />
          </div>
        </Panel>
      </section>

      {/* ---------------------------------------------------------- pages */}
      <section aria-label="Pages" className="mt-6">
        <Panel
          title="Pages"
          description="Grouped by route. Click a row for the full breakdown."
        >
          {pageRows.length === 0 ? (
            <EmptyState
              title="No page data yet"
              description="Page views arrive once the analytics tracker is running on the public site."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Page</Th>
                  <Th align="right">Views</Th>
                  <Th align="right">Visitors</Th>
                  <Th align="right">Engagement</Th>
                  <Th align="right">Scroll</Th>
                  <Th align="right">CTA</Th>
                  <Th align="right">Bookings</Th>
                  <Th align="right">Conv.</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.route} className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                    <Td>
                      <Link
                        href={`/admin/analytics/detail?route=${encodeURIComponent(row.route)}&range=${preset}`}
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {row.route}
                      </Link>
                    </Td>
                    <Td align="right">{formatNumber(row.views)}</Td>
                    <Td align="right">{formatNumber(row.visitors)}</Td>
                    <Td align="right">{formatDuration(row.avg_engagement_ms)}</Td>
                    <Td align="right">{formatPercent(row.avg_scroll_pct, 0)}</Td>
                    <Td align="right">{formatNumber(row.cta_clicks)}</Td>
                    <Td align="right">{formatNumber(row.bookings_attributed)}</Td>
                    <Td align="right">
                      {row.visitors === 0 ? (
                        <span className="text-mist-500">—</span>
                      ) : (
                        formatPercent(row.conversion_rate, 2)
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </section>

      {/* ------------------------------------------------------- rankings */}
      <section aria-label="Leaders" className="mt-6 grid gap-4 lg:grid-cols-2">
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
      </section>

      {/* --------------------------------------------------------- events */}
      <section aria-label="Events" className="mt-6">
        <Panel
          title="Events"
          description="Interactions recorded across the public site."
        >
          {eventRows.length === 0 ? (
            <EmptyState
              title="No events yet"
              description="CTA clicks, booking starts, practice completions and seed-sound plays appear here once the tracker is wired in."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Unique visitors</Th>
                </tr>
              </thead>
              <tbody>
                {eventRows.map((row) => (
                  <tr key={row.name}>
                    <Td>{EVENT_LABEL[row.name as AnalyticsEventName] ?? row.name}</Td>
                    <Td align="right">{formatNumber(row.total)}</Td>
                    <Td align="right">{formatNumber(row.visitors)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </section>

      {ga && !ga.configured ? (
        <p className="mt-6 text-xs text-mist-500">
          Google Analytics is not configured. These figures are HealerJi&rsquo;s own
          first-party records and do not depend on it — a booking is recorded here
          whether or not GA is ever connected.
        </p>
      ) : null}
    </>
  );
}
