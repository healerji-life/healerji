import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPaymentFromHandler } from "@/lib/services/payments";
import { getBookingByReference } from "@/lib/services/bookings";
import { notifyBookingConfirmed } from "@/lib/services/notifications";
import { recordBookingConversion } from "@/lib/services/analytics";

/**
 * Confirms a payment after Razorpay's browser handler fires.
 *
 * The handler's word is not evidence. What makes this authoritative is
 * verifyPaymentSignature(): an HMAC-SHA256 of "order_id|payment_id" computed
 * with RAZORPAY_KEY_SECRET, which only this server holds. A forged POST fails
 * the check and nothing is written.
 *
 * This route does not decide the booking's status either. It marks the payment
 * captured; the sync_booking_payment_status trigger is what moves the booking
 * to confirmed. The status returned below is then read back from the database,
 * so the confirmation screen shows what is actually recorded rather than what
 * the browser hoped for.
 *
 * The webhook is the backstop: if the customer closes the tab before this
 * fires, payment.captured arrives independently and confirms the same booking.
 */
const bodySchema = z.object({
  razorpay_order_id: z.string().min(4).max(64),
  razorpay_payment_id: z.string().min(4).max(64),
  razorpay_signature: z.string().min(16).max(256),
  reference: z.string().min(3).max(32),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid confirmation payload." }, { status: 400 });
  }
  const body = parsed.data;

  const confirmed = await confirmPaymentFromHandler({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });

  if (!confirmed.ok) {
    const status = confirmed.error.code === "forbidden" ? 400
      : confirmed.error.code === "not_configured" ? 503 : 502;
    return NextResponse.json(
      {
        ok: false,
        error:
          confirmed.error.code === "forbidden"
            ? "We could not verify that payment. If money has left your account, contact support with your booking reference and nothing will be lost."
            : confirmed.error.message,
      },
      { status }
    );
  }

  // Read the booking back, so the screen reflects the database.
  const booking = await getBookingByReference(body.reference);
  if (!booking.ok) {
    return NextResponse.json({
      ok: true,
      status: "confirmed_pending_read",
      message: "Your payment is verified. The booking is being finalised.",
    });
  }

  /**
   * Emails go out only once the DATABASE reports confirmed, so a receipt can
   * never be sent for a payment that did not settle. Awaited rather than
   * fire-and-forget because a serverless function may be frozen the moment the
   * response is returned — a detached promise would silently never run.
   * notifyBookingConfirmed never throws, so this cannot fail the confirmation.
   */
  if (booking.data.status === "confirmed" || booking.data.status === "completed") {
    await notifyBookingConfirmed(booking.data.id);
    // Authoritative conversion events: the browser is no longer trusted to
    // report payment_success / booking_complete.
    await recordBookingConversion(booking.data.id);
  }

  return NextResponse.json({
    ok: true,
    status: booking.data.status,
    paymentStatus: booking.data.payment_status,
    reference: booking.data.reference,
    startsAt: booking.data.starts_at,
    amountPaise: booking.data.amount_paise,
  });
}
