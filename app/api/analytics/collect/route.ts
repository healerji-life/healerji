import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deriveVisitorId, ingestEvent, ingestPageView } from "@/lib/services/analytics";
import {
  ALL_EVENT_NAMES,
  isServerAuthoritativeEvent,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  consumeRateLimit,
  clientIpFrom,
  RATE_LIMITS,
} from "@/lib/services/rate-limit";

/**
 * Analytics ingestion.
 *
 * Everything identifying is derived HERE, server-side, and never accepted from
 * the body:
 *
 *   visitor_id  a salted SHA-256 of (daily salt, IP, user-agent). The raw IP is
 *               never stored, and the daily salt rotation means the same person
 *               is countable within a day and uncorrelatable across days.
 *   user_id     read from the session cookie if there is one. A client cannot
 *               claim to be someone else.
 *   device      parsed from the user-agent here, not reported by the page.
 *   country     from the edge geo header only. No city, no coordinates.
 *
 * The event NAME is validated against the registry, so a visitor cannot invent
 * metric names or flood the table with junk categories.
 *
 * RLS grants no INSERT on the analytics tables to anon or authenticated, so this
 * route (service role) is the only write path. That is what stops someone
 * curl-ing 10,000 fake bookings into the funnel.
 */

const MAX_PROPERTY_BYTES = 2000;

const payloadSchema = z.object({
  name: z.string().max(64),
  path: z.string().max(300).optional(),
  route: z.string().max(300).optional(),
  sessionId: z.string().uuid().optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  healerId: z.string().uuid().optional(),
  articleId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  // page-view specific
  title: z.string().max(200).optional(),
  engagementMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  maxScrollPct: z.number().int().min(0).max(100).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.object({
    source: z.string().max(120).optional(),
    medium: z.string().max(120).optional(),
    campaign: z.string().max(160).optional(),
    content: z.string().max(160).optional(),
    term: z.string().max(160).optional(),
  }).optional(),
  screenWidth: z.number().int().min(0).max(20000).optional(),
});

/** Coarse device class from the user-agent. Deliberately not fingerprinting. */
function deviceType(ua: string, screenWidth?: number): "desktop" | "tablet" | "mobile" | "unknown" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|iphone|android.*mobile|windows phone/.test(s)) return "mobile";
  if (/android/.test(s)) return "tablet";
  if (s === "") return screenWidth ? (screenWidth < 768 ? "mobile" : "desktop") : "unknown";
  return "desktop";
}

function browserName(ua: string): string | null {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  return null;
}

function osName(ua: string): string | null {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

/** Known crawlers are recorded with is_bot so reports can exclude them. */
function looksLikeBot(ua: string): boolean {
  return /bot|crawler|spider|crawling|preview|lighthouse|headless|curl\/|wget|python-requests|vercel-screenshot/i.test(ua);
}

/** Host only — a full referrer URL can carry a query string with personal data. */
function referrerHost(referrer?: string): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).host || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Not configured is not an error the visitor should ever see or retry.
  if (!createAdminClient()) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 202 });
  }

  // Per-IP cap. Fails open: a limiter outage must not stop the site
  // reporting, and analytics is never worth a 5xx to a visitor.
  const ip = clientIpFrom(request.headers);
  const limit = await consumeRateLimit(RATE_LIMITS.analytics, ip);
  if (!limit.allowed) {
    // 202, not 429: the beacon is fire-and-forget and a visitor must never see
    // an error because of it. The event is simply dropped.
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 202 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const p = parsed.data;

  if (!(ALL_EVENT_NAMES as string[]).includes(p.name)) {
    // Unknown name: reject rather than store, so the events table cannot be
    // used as arbitrary storage.
    return NextResponse.json({ ok: false, reason: "unknown_event" }, { status: 400 });
  }

  // A registry-valid name is not evidence the thing happened. Conversion
  // events are emitted server-side from the verified payment path; accepting
  // them here let anyone set the revenue funnel to any number.
  if (isServerAuthoritativeEvent(p.name)) {
    return NextResponse.json(
      { ok: false, reason: "server_authoritative_event" },
      { status: 400 }
    );
  }
  const name = p.name as AnalyticsEventName;

  const ua = request.headers.get("user-agent") ?? "";
  const isBot = looksLikeBot(ua);
  const visitorId = await deriveVisitorId(ip, ua);
  const device = deviceType(ua, p.screenWidth);
  const country = request.headers.get("x-vercel-ip-country");

  // A signed-in visitor is attributed, but only from the cookie session.
  let userId: string | null = null;
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  // ------------------------------------------------------ session handling
  let sessionId = p.sessionId ?? null;
  if (name === "session_start" || !sessionId) {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("analytics_sessions")
        .insert({
          visitor_id: visitorId,
          user_id: userId,
          entry_path: p.path ?? null,
          entry_route: p.route ?? null,
          referrer_host: referrerHost(p.referrer),
          utm_source: p.utm?.source ?? null,
          utm_medium: p.utm?.medium ?? null,
          utm_campaign: p.utm?.campaign ?? null,
          utm_content: p.utm?.content ?? null,
          utm_term: p.utm?.term ?? null,
          device_type: device,
          browser: browserName(ua),
          os: osName(ua),
          country: country ?? null,
          is_bot: isBot,
        })
        .select("id")
        .single();
      sessionId = data?.id ?? null;
    }
  }

  // ----------------------------------------------------------- ingestion
  const propertyJson = JSON.stringify(p.properties ?? {});
  const properties = propertyJson.length > MAX_PROPERTY_BYTES ? {} : (p.properties ?? {});

  if (name === "page_view" || name === "page_exit") {
    await ingestPageView({
      name,
      visitorId,
      sessionId,
      userId,
      path: p.path ?? "/",
      route: p.route ?? p.path ?? "/",
      title: p.title ?? null,
      ...(p.engagementMs !== undefined ? { engagementMs: p.engagementMs } : {}),
      ...(p.maxScrollPct !== undefined ? { maxScrollPct: p.maxScrollPct } : {}),
      deviceType: device,
      country: country ?? null,
      isBot: isBot,
    });
  }

  // page_exit carries the final engagement numbers and is not also an event row.
  if (name !== "page_exit") {
    await ingestEvent({
      name,
      visitorId,
      sessionId,
      userId,
      path: p.path ?? null,
      route: p.route ?? null,
      properties,
      healerId: p.healerId ?? null,
      articleId: p.articleId ?? null,
      bookingId: p.bookingId ?? null,
      deviceType: device,
      country: country ?? null,
      isBot: isBot,
    });
  }

  // Keep the session's rolling counters honest.
  if (sessionId) {
    const admin = createAdminClient();
    if (admin) {
      await admin
        .from("analytics_sessions")
        .update({
          last_event_at: new Date().toISOString(),
          exit_path: p.path ?? null,
          ...(userId ? { user_id: userId } : {}),
        })
        .eq("id", sessionId);
    }
  }

  return NextResponse.json({ ok: true, sessionId }, { headers: { "Cache-Control": "no-store" } });
}
