import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * Counting happens in `consume_rate_limit()` (migration 20260824000100), which
 * is atomic across serverless instances. A module-level Map would look like a
 * rate limiter in review and do nothing in production, where each request may
 * land on a different instance.
 *
 * FAILS OPEN, on purpose. If the limiter itself is unavailable — the migration
 * is not yet applied, the service role is unset, the database is briefly
 * unreachable — the request is allowed and the failure is logged. The endpoints
 * this protects are a visitor's analytics beacon and two contact forms; taking
 * the public site down to enforce a spam limit is the wrong trade, and it also
 * means this can deploy safely ahead of its migration.
 */

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window rolls over. */
  retryAfter: number;
  /** True when the limiter could not be consulted and the request was let through. */
  degraded: boolean;
}

const ALLOW_DEGRADED: RateLimitVerdict = {
  allowed: true,
  remaining: 0,
  retryAfter: 0,
  degraded: true,
};

export interface RateLimitRule {
  /** Namespace, e.g. "analytics" or "contact". Keeps buckets from colliding. */
  name: string;
  limit: number;
  windowSeconds: number;
}

/** Tuned per endpoint; see each call site for the reasoning. */
export const RATE_LIMITS = {
  /** A real page emits a handful of events per view; 120/min is generous. */
  analytics: { name: "analytics", limit: 120, windowSeconds: 60 },
  /** A person sends one message. Six an hour from one IP is already unusual. */
  contactPerIp: { name: "contact-ip", limit: 6, windowSeconds: 3600 },
  /** Same address twice is a retry; ten times is a script. */
  contactPerEmail: { name: "contact-email", limit: 3, windowSeconds: 3600 },
  /** Applying is a considered act — nobody does it four times an hour. */
  applyPerIp: { name: "apply-ip", limit: 4, windowSeconds: 3600 },
  applyPerEmail: { name: "apply-email", limit: 2, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Consumes one unit against `rule` for `identifier`.
 *
 * `identifier` is an IP or an email — never anything a visitor can set freely,
 * or the bucket becomes trivial to evade.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitVerdict> {
  const admin = createAdminClient();
  if (!admin) return ALLOW_DEGRADED;

  const cleaned = identifier.trim().toLowerCase();
  if (!cleaned || cleaned === "unknown") return ALLOW_DEGRADED;

  try {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_bucket: `${rule.name}:${cleaned}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) {
      console.error("[rate-limit] unavailable, allowing request", rule.name, error.message);
      return ALLOW_DEGRADED;
    }

    const verdict = data as {
      allowed?: boolean;
      remaining?: number;
      retry_after?: number;
    } | null;

    if (!verdict || typeof verdict.allowed !== "boolean") {
      console.error("[rate-limit] unexpected response shape, allowing request", rule.name);
      return ALLOW_DEGRADED;
    }

    return {
      allowed: verdict.allowed,
      remaining: verdict.remaining ?? 0,
      retryAfter: verdict.retry_after ?? rule.windowSeconds,
      degraded: false,
    };
  } catch (error) {
    console.error("[rate-limit] threw, allowing request", rule.name, error);
    return ALLOW_DEGRADED;
  }
}

/** The originating client IP, left-most entry of x-forwarded-for on Vercel. */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** 429 body plus a Retry-After header, shaped like the other error responses. */
export function tooManyRequests(verdict: RateLimitVerdict, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(verdict.retryAfter, 1)),
    },
  });
}
