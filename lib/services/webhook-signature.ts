import crypto from "node:crypto";

/**
 * Razorpay webhook authenticity, as pure functions.
 *
 * Split out of `lib/services/payments.ts` so the security-critical part can be
 * tested directly: that module imports `server-only` and the service-role
 * Supabase client, neither of which loads in a plain Node test process.
 *
 * The secret is a parameter rather than an environment read for the same
 * reason — a test can exercise the real comparison without arranging global
 * state, and the caller keeps a single place where the env is read.
 */

/**
 * Constant-time compare of two hex digests.
 *
 * Length is checked first because `timingSafeEqual` throws on differing
 * lengths. That leaks only the length of a hash whose length is fixed and
 * public anyway.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/** Webhook scheme: HMAC-SHA256 of the raw request body, hex encoded. */
export function isValidWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string | undefined
): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(signature, expected);
}

/** Handler scheme: HMAC-SHA256 of "order_id|payment_id", hex encoded. */
export function isValidPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string | undefined
): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeEqualHex(signature, expected);
}

/**
 * The idempotency key for a webhook delivery.
 *
 * Razorpay does not always send `x-razorpay-event-id`. The fallback is derived
 * from the signature, which only the holder of the shared secret can produce —
 * safe *because* the caller verifies the signature before this is used. If it
 * were computed for unverified requests, an attacker could choose the key.
 */
export function webhookDedupeId(
  eventId: string,
  eventType: string,
  verifiedSignature: string
): string {
  return eventId || `${eventType}:${verifiedSignature.slice(0, 32)}`;
}
