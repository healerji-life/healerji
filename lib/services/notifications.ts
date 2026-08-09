import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendBookingConfirmation, sendNewSessionToHealer,
  sendCancellationToCustomer, sendCancellationToHealer,
  isEmailConfigured, type BookingEmailContext,
} from "@/lib/services/email";

/**
 * Booking notifications.
 *
 * One place that assembles the context an email needs and dispatches both the
 * customer and healer copies. Called from the payment-verification path and from
 * the cancellation actions.
 *
 * Uses the service role because it runs after a webhook (no user session) and
 * needs the healer's email, which RLS does not expose to a customer.
 *
 * Deliberately returns void and never throws: a paid booking is confirmed
 * whether or not the receipt sends. Failures are logged with the reference so
 * they can be resent by hand.
 */

interface BookingRecipients {
  context: BookingEmailContext;
  healerEmail: string | null;
}

async function loadContext(bookingId: string): Promise<BookingRecipients | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      "reference, session_kind, duration_minutes, starts_at, amount_paise, guest_name, guest_email, customer_note, customer_id, healer_id"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return null;

  const [{ data: healer }, { data: profile }] = await Promise.all([
    admin.from("healers").select("name, timezone, user_id").eq("id", booking.healer_id).maybeSingle(),
    booking.customer_id
      ? admin.from("profiles").select("email, full_name").eq("id", booking.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // A healer's contact address lives on their linked profile, not the healer row.
  let healerEmail: string | null = null;
  if (healer?.user_id) {
    const { data: healerProfile } = await admin
      .from("profiles").select("email").eq("id", healer.user_id).maybeSingle();
    healerEmail = healerProfile?.email ?? null;
  }

  // Prefer the account address; fall back to what was given at checkout.
  const customerEmail = profile?.email ?? booking.guest_email;
  if (!customerEmail) return null;

  return {
    healerEmail,
    context: {
      reference: booking.reference,
      customerName: profile?.full_name ?? booking.guest_name ?? "there",
      customerEmail,
      healerName: healer?.name ?? "your healer",
      ...(healerEmail ? { healerEmail } : {}),
      sessionKind: booking.session_kind,
      durationMinutes: booking.duration_minutes,
      startsAt: booking.starts_at,
      amountPaise: booking.amount_paise,
      customerNote: booking.customer_note,
      timezone: healer?.timezone ?? "Asia/Kolkata",
    },
  };
}

/** Called once a payment is verified and the booking is confirmed. */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.info("[email] not configured — no confirmation sent for booking", bookingId);
    return;
  }

  const loaded = await loadContext(bookingId);
  if (!loaded) {
    console.error("[email] could not assemble context for booking", bookingId);
    return;
  }

  const [customer, healer] = await Promise.all([
    sendBookingConfirmation(loaded.context),
    loaded.healerEmail ? sendNewSessionToHealer(loaded.context) : Promise.resolve(null),
  ]);

  if (!customer.ok) {
    console.error("[email] confirmation failed", loaded.context.reference, customer.error.message);
  }
  if (healer && !healer.ok) {
    console.error("[email] healer notification failed", loaded.context.reference, healer.error.message);
  }
}

export async function notifyBookingCancelled(
  bookingId: string,
  refundNote: string
): Promise<void> {
  if (!isEmailConfigured()) {
    console.info("[email] not configured — no cancellation sent for booking", bookingId);
    return;
  }

  const loaded = await loadContext(bookingId);
  if (!loaded) {
    console.error("[email] could not assemble context for booking", bookingId);
    return;
  }

  const [customer, healer] = await Promise.all([
    sendCancellationToCustomer({ ...loaded.context, refundNote }),
    loaded.healerEmail ? sendCancellationToHealer(loaded.context) : Promise.resolve(null),
  ]);

  if (!customer.ok) {
    console.error("[email] cancellation failed", loaded.context.reference, customer.error.message);
  }
  if (healer && !healer.ok) {
    console.error("[email] healer cancellation failed", loaded.context.reference, healer.error.message);
  }
}
