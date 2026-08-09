import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { createHold } from "@/lib/services/bookings";
import { recordOrderCreated, releaseHold } from "@/lib/services/payments";
import { isConfigured } from "@/lib/services/integrations";

/**
 * Checkout: reserve the slot, then open a payment for it.
 *
 * Order of operations matters and is deliberate:
 *
 *   1. create_booking_hold() writes a pending_payment booking. The database's
 *      exclusion constraint means this either reserves the slot or fails —
 *      there is no window in which two people both hold it.
 *   2. Only then is a Razorpay order created, for the amount the DATABASE
 *      computed from the healer's own pricing.
 *   3. If the order cannot be created, the hold is released immediately rather
 *      than left to expire, so the slot returns to the calendar at once.
 *
 * The browser supplies who, which healer, and when. It never supplies the
 * amount, the status, or the order id — every one of those is derived here.
 *
 * Replaces the previous implementation, which read healer pricing from
 * lib/data/healers.ts and created an order without reserving anything.
 */
const bodySchema = z.object({
  healer: z.string().min(1).max(80),
  sessionType: z.enum(["chat", "audio", "video"]),
  slot: z.string().datetime(),
  minutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/),
  note: z.string().max(600).optional(),
  sourcePath: z.string().max(200).optional(),
  sourceRoute: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the booking details and try again." },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || !isConfigured("razorpay")) {
    // Fail before holding a slot: reserving a time we cannot take payment for
    // would block it from someone who could actually book.
    return NextResponse.json(
      {
        error:
          "Payments aren't configured on this deployment yet. Please book through the HealerJi app for now.",
      },
      { status: 503 }
    );
  }

  // ---------------------------------------------------------------- 1. hold
  const hold = await createHold({
    healerSlug: body.healer,
    sessionKind: body.sessionType,
    startsAt: body.slot,
    durationMinutes: body.minutes,
    name: body.name,
    email: body.email,
    phone: body.phone,
    ...(body.note ? { note: body.note } : {}),
    ...(body.sourcePath ? { sourcePath: body.sourcePath } : {}),
    ...(body.sourceRoute ? { sourceRoute: body.sourceRoute } : {}),
  });

  if (!hold.ok) {
    // 409 is the signal the UI uses to say "that time was just taken" and
    // reload availability, rather than showing a generic failure.
    if (hold.error.code === "slot_taken" || hold.error.code === "conflict") {
      return NextResponse.json(
        { error: "This time was just booked. Please choose another available time.", code: "slot_taken" },
        { status: 409 }
      );
    }
    const status =
      hold.error.code === "not_found" ? 404 :
      hold.error.code === "not_configured" ? 503 :
      hold.error.code === "validation" ? 400 : 500;
    return NextResponse.json({ error: hold.error.message, code: hold.error.code }, { status });
  }

  // --------------------------------------------------------------- 2. order
  try {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: hold.data.amountPaise,      // from the database, not the client
      currency: hold.data.currency,
      receipt: hold.data.reference,
      notes: {
        booking_id: hold.data.bookingId,
        reference: hold.data.reference,
        healer: body.healer,
        session_kind: body.sessionType,
        starts_at: hold.data.startsAt,
      },
    });

    const recorded = await recordOrderCreated({
      bookingId: hold.data.bookingId,
      orderId: order.id,
      amountPaise: hold.data.amountPaise,
      currency: hold.data.currency,
    });

    if (!recorded.ok) {
      await releaseHold(hold.data.bookingId, "payment ledger write failed");
      return NextResponse.json(
        { error: "We couldn't start the payment. Nothing was charged — please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      amount: hold.data.amountPaise,
      currency: hold.data.currency,
      keyId,                              // public by design; the secret stays here
      reference: hold.data.reference,
      bookingId: hold.data.bookingId,
      holdExpiresAt: hold.data.holdExpiresAt,
    });
  } catch {
    await releaseHold(hold.data.bookingId, "razorpay order creation failed");
    return NextResponse.json(
      { error: "We couldn't reach the payment service. Nothing was charged — please try again." },
      { status: 502 }
    );
  }
}
