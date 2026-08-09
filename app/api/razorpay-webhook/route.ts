import { NextResponse } from "next/server";
import { ingestWebhookEvent, markWebhookProcessed, applyWebhookEvent } from "@/lib/services/payments";
import { notifyBookingConfirmed } from "@/lib/services/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay webhook — the authoritative record of payment.
 *
 * Three properties this needs, all of which live below or in the database:
 *
 *   Authenticity   the signature is an HMAC-SHA256 of the RAW body with
 *                  RAZORPAY_WEBHOOK_SECRET, compared in constant time. The raw
 *                  text is read before any parsing, because re-serialising JSON
 *                  would change the bytes and break the hash.
 *   Idempotency    the event id is inserted into webhook_events under a unique
 *                  index. A replayed delivery hits the conflict, is answered
 *                  200, and is not applied twice.
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

  let eventType = "unknown";
  try {
    const parsed = JSON.parse(raw) as { event?: string };
    if (typeof parsed.event === "string") eventType = parsed.event;
  } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  // Razorpay does not always send an event id header; fall back to a
  // deterministic id so replay protection still holds.
  const dedupeId = eventId || `${eventType}:${signature.slice(0, 32)}`;

  const ingested = await ingestWebhookEvent({
    eventId: dedupeId,
    eventType,
    rawBody: raw,
    signature,
  });

  if (!ingested.ok) {
    return NextResponse.json({ error: ingested.error.message }, { status: 503 });
  }

  // Recorded for forensics, then rejected. A forged webhook must never be able
  // to confirm a booking.
  if (!ingested.data.signatureValid) {
    await markWebhookProcessed(dedupeId, "invalid signature — not applied");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (ingested.data.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const applied = await applyWebhookEvent(eventType, JSON.parse(raw));
  await markWebhookProcessed(dedupeId, applied.ok ? undefined : applied.error.message);

  /**
   * The webhook is the backstop: if the customer closed the tab before
   * /api/booking/verify ran, this is what confirms the booking and sends the
   * receipt. Idempotency is already guaranteed by webhook_events, so a retried
   * delivery reaches the duplicate branch above and never emails twice.
   */
  if (applied.ok && (eventType === "payment.captured" || eventType === "order.paid")) {
    const bookingId = await bookingIdForOrder(raw);
    if (bookingId) await notifyBookingConfirmed(bookingId);
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
