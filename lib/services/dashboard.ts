import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";
import type { DateRange } from "@/lib/services/analytics";

/**
 * Dashboard aggregates.
 *
 * All of these call SECURITY DEFINER functions that enforce is_staff() inside
 * the database. This module cannot widen access even by mistake — the worst it
 * can do is ask for something and be refused.
 *
 * Every figure returned is a real aggregate over real rows. Where a metric has
 * no underlying data the value is null, and the UI must render that as
 * "No data yet" rather than as zero: those mean different things to an
 * operator deciding whether something is broken.
 */

export interface DashboardSummary {
  grossRevenuePaise: number;
  netRevenuePaise: number;
  refundedPaise: number;
  paymentsCaptured: number;
  paymentsFailed: number;
  bookings: number;
  bookingsCancelled: number;
  upcomingSessions: number;
  activeHealers: number;
  healersAccepting: number;
  customersTotal: number;
  customersNew: number;
  publishedArticles: number;
  visitors: number;
  pageViews: number;
  sessions: number;
  avgEngagementMs: number | null;
  avgScrollPct: number | null;
  /** bookings ÷ visitors, or null when there was no traffic to convert. */
  conversionRate: number | null;
}

const int = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const nullableInt = (v: unknown): number | null =>
  v === null || v === undefined ? null : (Number.isFinite(Number(v)) ? Number(v) : null);

export async function getDashboardSummary(range: DateRange): Promise<Result<DashboardSummary>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase.rpc("admin_dashboard_summary", {
    range_start: range.from.toISOString(),
    range_end: range.to.toISOString(),
  });
  if (error) return fromPostgrestError(error, "We couldn't load the dashboard.");

  const raw = (data ?? {}) as unknown as Record<string, unknown>;
  const visitors = int(raw.visitors);
  const bookings = int(raw.bookings);

  return ok({
    grossRevenuePaise: int(raw.gross_revenue_paise),
    netRevenuePaise: int(raw.net_revenue_paise),
    refundedPaise: int(raw.refunded_paise),
    paymentsCaptured: int(raw.payments_captured),
    paymentsFailed: int(raw.payments_failed),
    bookings,
    bookingsCancelled: int(raw.bookings_cancelled),
    upcomingSessions: int(raw.upcoming_sessions),
    activeHealers: int(raw.active_healers),
    healersAccepting: int(raw.healers_accepting),
    customersTotal: int(raw.customers_total),
    customersNew: int(raw.customers_new),
    publishedArticles: int(raw.published_articles),
    visitors,
    pageViews: int(raw.page_views),
    sessions: int(raw.sessions),
    avgEngagementMs: nullableInt(raw.avg_engagement_ms),
    avgScrollPct: nullableInt(raw.avg_scroll_pct),
    conversionRate: visitors > 0 ? (bookings / visitors) * 100 : null,
  });
}

export interface SeriesPoint {
  day: string;
  revenuePaise: number;
  bookings: number;
  visitors: number;
  pageViews: number;
}

export async function getDailySeries(range: DateRange): Promise<Result<SeriesPoint[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase.rpc("admin_daily_series", {
    range_start: range.from.toISOString(),
    range_end: range.to.toISOString(),
  });
  if (error) return fromPostgrestError(error, "We couldn't load the charts.");

  return ok(
    (data ?? []).map((row) => ({
      day: row.day,
      revenuePaise: int(row.revenue_paise),
      bookings: int(row.bookings),
      visitors: int(row.visitors),
      pageViews: int(row.page_views),
    }))
  );
}

export async function getTopHealers(range: DateRange, limit = 5) {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.rpc("admin_top_healers", {
    range_start: range.from.toISOString(),
    range_end: range.to.toISOString(),
    row_limit: limit,
  });
  if (error) return fromPostgrestError(error, "We couldn't load top healers.");
  return ok(data ?? []);
}

export async function getTopArticles(range: DateRange, limit = 5) {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.rpc("admin_top_articles", {
    range_start: range.from.toISOString(),
    range_end: range.to.toISOString(),
    row_limit: limit,
  });
  if (error) return fromPostgrestError(error, "We couldn't load top articles.");
  return ok(data ?? []);
}

export async function getEventTotals(range: DateRange) {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.rpc("admin_event_totals", {
    range_start: range.from.toISOString(),
    range_end: range.to.toISOString(),
  });
  if (error) return fromPostgrestError(error, "We couldn't load events.");
  return ok(data ?? []);
}

export async function getPageDetail(route: string, range: DateRange) {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.rpc("admin_page_detail", {
    p_route: route,
    range_start: range.from.toISOString(),
    range_end: range.to.toISOString(),
  });
  if (error) return fromPostgrestError(error, "We couldn't load that page's detail.");
  return ok((data ?? {}) as unknown as Record<string, unknown>);
}
