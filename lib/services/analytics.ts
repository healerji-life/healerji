import "server-only";
import { webcrypto } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";
import type { PageEngagementRow } from "@/lib/supabase/types";

/**
 * Analytics.
 *
 * Requirement 41 asks for a provider boundary so Google Analytics can be added
 * later without the business events depending on it. That is what this
 * interface is for: HealerJi's own events always go to Supabase, and a second
 * provider can be attached alongside — never instead.
 */
export interface AnalyticsProvider {
  readonly id: string;
  readonly configured: boolean;
  getPageEngagement(range: DateRange, device?: string): Promise<Result<PageEngagementRow[]>>;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type RangePreset = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export function resolveRange(preset: RangePreset, custom?: DateRange): DateRange {
  const to = new Date();
  const from = new Date(to);
  switch (preset) {
    case "today": from.setHours(0, 0, 0, 0); break;
    case "7d":    from.setDate(from.getDate() - 7); break;
    case "30d":   from.setDate(from.getDate() - 30); break;
    case "90d":   from.setDate(from.getDate() - 90); break;
    case "ytd":   from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
    case "custom":
      if (custom) return custom;
      from.setDate(from.getDate() - 30);
      break;
  }
  return { from, to };
}

/** The previous window of equal length, for period-on-period comparison. */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime()) };
}

/**
 * The first-party provider. Reads page_engagement_report(), which enforces
 * is_staff() inside the database — this module could not bypass it if it tried.
 */
export const supabaseAnalytics: AnalyticsProvider = {
  id: "supabase",
  get configured() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  async getPageEngagement(range, device) {
    const supabase = await createClient();
    if (!supabase) return NOT_CONFIGURED("Supabase");

    const { data, error } = await supabase.rpc("page_engagement_report", {
      range_start: range.from.toISOString(),
      range_end: range.to.toISOString(),
      device: device ?? null,
    });

    if (error) return fromPostgrestError(error, "We couldn't load analytics.");
    return ok(data ?? []);
  },
};

// --------------------------------------------------------------- ingest ----

export interface IngestPayload {
  name: string;
  visitorId: string;
  sessionId?: string | null;
  userId?: string | null;
  path?: string | null;
  route?: string | null;
  properties?: Record<string, unknown>;
  healerId?: string | null;
  articleId?: string | null;
  bookingId?: string | null;
  deviceType?: "desktop" | "tablet" | "mobile" | "unknown";
  country?: string | null;
  isBot?: boolean;
}

/**
 * Ingestion runs with the service role, from a route handler.
 *
 * That is not a convenience: RLS grants no INSERT on the analytics tables to
 * anon or authenticated, so a visitor cannot forge events, inflate a page's
 * numbers, or attribute a booking to a page it never came from. The route
 * handler derives visitorId server-side rather than trusting the body.
 */
export async function ingestEvent(payload: IngestPayload): Promise<Result<null>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { error } = await admin.from("analytics_events").insert({
    name: payload.name,
    visitor_id: payload.visitorId,
    session_id: payload.sessionId ?? null,
    user_id: payload.userId ?? null,
    path: payload.path ?? null,
    route: payload.route ?? null,
    properties: (payload.properties ?? {}) as never,
    healer_id: payload.healerId ?? null,
    article_id: payload.articleId ?? null,
    booking_id: payload.bookingId ?? null,
    is_bot: payload.isBot ?? false,
  });

  if (error) return fromPostgrestError(error);
  return ok(null);
}

export async function ingestPageView(payload: IngestPayload & {
  title?: string | null;
  engagementMs?: number;
  maxScrollPct?: number;
}): Promise<Result<null>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { error } = await admin.from("page_views").insert({
    visitor_id: payload.visitorId,
    session_id: payload.sessionId ?? null,
    user_id: payload.userId ?? null,
    path: payload.path ?? "/",
    route: payload.route ?? payload.path ?? "/",
    title: payload.title ?? null,
    engagement_ms: Math.max(0, Math.round(payload.engagementMs ?? 0)),
    max_scroll_pct: Math.min(100, Math.max(0, Math.round(payload.maxScrollPct ?? 0))),
    device_type: payload.deviceType ?? "unknown",
    country: payload.country ?? null,
    is_bot: payload.isBot ?? false,
  });

  if (error) return fromPostgrestError(error);
  return ok(null);
}

/**
 * Salted, rotating visitor hash.
 *
 * Requirement 54 and basic decency: no raw IP is stored. The daily salt
 * rotation means the same person is countable within a day and uncorrelatable
 * across days, which is enough for "unique visitors" and not enough to build a
 * profile.
 */
export async function deriveVisitorId(ip: string, userAgent: string): Promise<string> {
  const salt = process.env.ANALYTICS_SALT ?? "healerji-dev-salt";
  const day = new Date().toISOString().slice(0, 10);
  const input = `${salt}:${day}:${ip}:${userAgent}`;

  const bytes = new TextEncoder().encode(input);
  // webcrypto imported explicitly: the global `crypto` exists at runtime in
  // Node 18+ and on Vercel's edge, but relying on the ambient type is fragile.
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
