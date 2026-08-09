import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { resolveRange, type RangePreset } from "@/lib/services/analytics";
import { getPageDetail } from "@/lib/services/dashboard";
import { PageHeader, Panel, StatCard, Table, Th, Td, EmptyState, ErrorState } from "@/components/admin/ui";
import { RangeTabs } from "@/components/admin/range-tabs";
import { EVENT_LABEL, type AnalyticsEventName } from "@/lib/analytics/events";
import { formatNumber, formatPercent, formatDuration, formatPaise, formatDate } from "@/lib/format";

export const metadata = { title: "Page analytics · HealerJi Operations" };
export const dynamic = "force-dynamic";

const PRESETS: RangePreset[] = ["today", "7d", "30d", "90d", "ytd"];

const int = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const nullable = (v: unknown): number | null =>
  v === null || v === undefined ? null : (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * One page, in detail.
 *
 * Backed by admin_page_detail(), which aggregates and never returns a row that
 * identifies an individual visitor. Where a metric has no rows behind it the
 * card reads "Not enough data" rather than inventing a figure.
 */
export default async function PageAnalyticsDetail({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; range?: string }>;
}) {
  await requirePermission("analytics.view");
  const params = await searchParams;

  const route = params.route ?? "";
  const preset: RangePreset = PRESETS.includes(params.range as RangePreset)
    ? (params.range as RangePreset)
    : "30d";
  const range = resolveRange(preset);

  if (!route) {
    return (
      <>
        <PageHeader eyebrow="Analytics" title="Page analytics" />
        <ErrorState message="No page was specified." detail="Choose a row from the Pages table." />
      </>
    );
  }

  const result = await getPageDetail(route, range);
  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Analytics" title={route} />
        <ErrorState message={result.error.message} />
      </>
    );
  }

  const d = result.data;
  const views = int(d.views);
  const visitors = int(d.visitors);
  const bookings = int(d.bookings_attributed);
  const engagement = nullable(d.avg_engagement_ms);
  const scroll = nullable(d.avg_scroll_pct);

  const devices = Array.isArray(d.devices) ? (d.devices as { device: string; views: number }[]) : [];
  const sources = Array.isArray(d.sources) ? (d.sources as { source: string; views: number }[]) : [];
  const events = Array.isArray(d.events) ? (d.events as { name: string; count: number }[]) : [];

  const eventCount = (name: string) => events.find((e) => e.name === name)?.count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title={route}
        description={`${formatDate(range.from)} — ${formatDate(range.to)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <RangeTabs basePath="/admin/analytics/detail" current={preset} extraParams={{ route }} />
            <Link
              href={`/admin/analytics?range=${preset}`}
              className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
            >
              All pages
            </Link>
          </div>
        }
      />

      {views === 0 ? (
        <EmptyState
          title="No views recorded for this page"
          description="Either nobody visited it in this period, or the tracker was not yet running."
        />
      ) : (
        <>
          <section aria-label="Engagement" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Views" value={formatNumber(views)} />
            <StatCard label="Unique visitors" value={visitors === 0 ? null : formatNumber(visitors)} />
            <StatCard
              label="Avg engagement"
              value={engagement === null ? null : formatDuration(engagement)}
              hint={engagement === null ? "Not enough data" : undefined}
            />
            <StatCard
              label="Scroll depth"
              value={scroll === null ? null : formatPercent(scroll, 0)}
              hint={scroll === null ? "Not enough data" : undefined}
            />
          </section>

          <section aria-label="Conversion" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="CTA clicks" value={formatNumber(eventCount("cta_click"))} />
            <StatCard label="Book session clicks" value={formatNumber(eventCount("book_session_click"))} />
            <StatCard label="Booking starts" value={formatNumber(eventCount("booking_start"))} />
            <StatCard
              label="Bookings"
              value={bookings}
              hint={
                visitors === 0
                  ? "Not enough data"
                  : `${formatPercent((bookings / visitors) * 100, 2)} of visitors`
              }
            />
          </section>

          {int(d.revenue_paise) > 0 ? (
            <p className="mt-4 text-sm text-ink-600 dark:text-mist-400">
              {formatPaise(int(d.revenue_paise))} in confirmed bookings is attributed to
              this page, matched on where the customer began their booking.
            </p>
          ) : null}

          <section aria-label="Breakdown" className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Devices">
              {devices.length === 0 ? (
                <p className="px-6 py-8 text-sm text-mist-500">Not enough data.</p>
              ) : (
                <Table>
                  <thead>
                    <tr><Th>Device</Th><Th align="right">Views</Th></tr>
                  </thead>
                  <tbody>
                    {devices.map((row) => (
                      <tr key={row.device}>
                        <Td className="capitalize">{row.device}</Td>
                        <Td align="right">{formatNumber(int(row.views))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>

            <Panel title="Traffic source">
              {sources.length === 0 ? (
                <p className="px-6 py-8 text-sm text-mist-500">Not enough data.</p>
              ) : (
                <Table>
                  <thead>
                    <tr><Th>Referrer</Th><Th align="right">Views</Th></tr>
                  </thead>
                  <tbody>
                    {sources.map((row) => (
                      <tr key={row.source}>
                        <Td>{row.source}</Td>
                        <Td align="right">{formatNumber(int(row.views))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>

            <Panel title="All events on this page">
              {events.length === 0 ? (
                <p className="px-6 py-8 text-sm text-mist-500">No events recorded.</p>
              ) : (
                <Table>
                  <thead>
                    <tr><Th>Event</Th><Th align="right">Count</Th></tr>
                  </thead>
                  <tbody>
                    {events.map((row) => (
                      <tr key={row.name}>
                        <Td>{EVENT_LABEL[row.name as AnalyticsEventName] ?? row.name}</Td>
                        <Td align="right">{formatNumber(int(row.count))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </section>
        </>
      )}
    </>
  );
}
