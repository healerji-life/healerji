import { NextResponse } from "next/server";
import {
  recordVerifiedWebhookEvent,
  markWebhookProcessed,
  applyWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/services/payments";
import { webhookDedupeId } from "@/lib/services/webhook-signature";
import { notifyBookingConfirmed } from "@/lib/services/notifications";
import { recordBookingConversion } from "@/lib/services/analytics";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay webhook — the authoritative record of payment.
 *
 * Three properties this needs, all of which live below or in the database:
 *
 *   Authenticity   the signature is an HMAC-SHA256 of the RAW body with
 *                  RAZORPAY_WEBHOOK_SECRET, compared in constant time. The raw
 *                  text is read before any parsing, because re-serialising JSON
 *                  would change the bytes and break the hash. This is checked
 *                  FIRST and nothing is written until it passes — otherwise a
 *                  forged request could occupy the event id a genuine delivery
 *                  needs, and that delivery would be silently skipped as a
 *                  duplicate.
 *   Idempotency    the verified event id is inserted into webhook_events under
 *                  a unique index. A replayed delivery hits the conflict, is
 *                  answered 200, and is not applied twice.
 *   Durability     200 is returned even when our own processing failed, with
 *                  the error stored on the row. A non-200 makes Razorpay retry
 *                  aggressively; the event is already safely recorded, so the
 *                  right move is to accept it and fix it from the failed queue.
 *
 * Previously this handler only console.logged. Payments are now persisted, and
 * a captured payment is what confirms the booking.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // 1. Authenticity, BEFORE any write. An invalid signature is rejected here
  //    and never reaches the dedupe store, so a forged request cannot occupy
  //    the event id that a genuine delivery will later need.
  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[webhook] rejected: invalid signature", { eventId: eventId || "(none)" });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  // 2. Only now is the body worth parsing.
  let eventType = "unknown";
  try {
    const parsed = JSON.parse(raw) as { event?: string };
    if (typeof parsed.event === "string") eventType = parsed.event;
  } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  // Razorpay does not always send an event id header. The fallback is derived
  // from the verified signature, which only the holder of the shared secret can
  // produce — so it is still unforgeable now that verification comes first.
  const dedupeId = webhookDedupeId(eventId, eventType, signature);

  // 3. Idempotency. The unique index on event_id is what makes a retried
  //    delivery safe; two concurrent deliveries of the same event race here and
  //    exactly one wins.
  const recorded = await recordVerifiedWebhookEvent({
    eventId: dedupeId,
    eventType,
    rawBody: raw,
  });

  if (!recorded.ok) {
    return NextResponse.json({ error: recorded.error.message }, { status: 503 });
  }

  if (recorded.data.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 4. Apply exactly once.
  const applied = await applyWebhookEvent(eventType, JSON.parse(raw));
  await markWebhookProcessed(dedupeId, applied.ok ? undefined : applied.error.message);

  if (applied.ok && (eventType === "payment.captured" || eventType === "order.paid")) {
    const bookingId = await bookingIdForOrder(raw);
    if (bookingId) {
      await notifyBookingConfirmed(bookingId);
      await recordBookingConversion(bookingId);
    }
  }

  return NextResponse.json({ received: true, applied: applied.ok });
}

/** Resolves the booking behind a webhook via the payments ledger. */
async function bookingIdForOrder(rawBody: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  let orderId: string | null = null;
  try {
    const parsed = JSON.parse(rawBody) as {
      payload?: {
        payment?: { entity?: { order_id?: string } };
        order?: { entity?: { id?: string } };
      };
    };
    orderId = parsed.payload?.payment?.entity?.order_id ?? parsed.payload?.order?.entity?.id ?? null;
  } catch {
    return null;
  }
  if (!orderId) return null;

  const { data } = await admin
    .from("payments").select("booking_id").eq("razorpay_order_id", orderId).maybeSingle();
  return data?.booking_id ?? null;
}
