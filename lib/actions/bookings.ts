"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cancelBooking, getBookingDetail } from "@/lib/services/bookings";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import { fromPostgrestError } from "@/lib/services/types";
import type { BookingRow } from "@/lib/supabase/types";
import { notifyBookingCancelled } from "@/lib/services/notifications";

export interface BookingActionState {
  error?: string;
  notice?: string;
}

/**
 * A customer cancelling their own booking.
 *
 * There is no ownership check written here on purpose. The RLS policy on
 * bookings only permits UPDATE where customer_id = auth.uid(), and
 * guard_booking_edit() additionally restricts a customer to moving the status to
 * 'cancelled' and nothing else. A crafted POST with someone else's booking id
 * updates zero rows.
 *
 * Cancelling frees the slot immediately: 'cancelled' falls outside the
 * exclusion constraint's WHERE clause, so the time returns to the public
 * calendar without any further action.
 */
export async function cancelMyBookingAction(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Bookings aren't available on this deployment yet." };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Please sign in again." };

  const id = String(formData.get("bookingId") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { error: "That booking could not be found." };

  const result = await cancelBooking(id, "cancelled by customer");
  if (!result.ok) {
    return {
      error:
        result.error.code === "forbidden"
          ? "That booking can no longer be cancelled here. Please contact support."
          : result.error.message,
    };
  }

  await notifyBookingCancelled(
    id,
    "Any refund follows the published policy and appears on your original payment method within 5–7 working days."
  );

  revalidatePath("/bookings");
  return {
    notice:
      "Cancelled. Any refund follows the published policy and appears on your original payment method.",
  };
}

/**
 * An admin changing a booking's status.
 *
 * Distinct from the customer path: an admin may mark a session completed or a
 * no-show, which guard_booking_edit() forbids to customers.
 */
const ADMIN_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;

export async function updateBookingStatusAction(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const auth = await authorise("bookings.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof ADMIN_STATUSES)[number];
  const note = String(formData.get("note") ?? "").slice(0, 500);

  if (!ADMIN_STATUSES.includes(status)) {
    return { error: "That status isn't allowed." };
  }

  const before = await getBookingDetail(id);
  if (!before.ok) return { error: before.error.message };

  const supabase = await createClient();
  if (!supabase) return { error: "Not configured." };

  const patch: Partial<BookingRow> = { status };
  if (status === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
    patch.cancelled_by = auth.viewer.id;
    patch.cancellation_reason = note || "cancelled by HealerJi";
  }
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (note) patch.healer_note = note;

  const { error } = await supabase.from("bookings").update(patch).eq("id", id);
  if (error) return { error: fromPostgrestError(error, "We couldn't update that booking.").error.message };

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.bookingCancelled,
    resourceType: "booking",
    resourceId: id,
    summary: `Booking ${before.data.booking.reference} → ${status}`,
    before: { status: before.data.booking.status },
    after: { status },
  });

  if (status === "cancelled") {
    await notifyBookingCancelled(
      id,
      note || "If this session was paid for, a refund follows the published policy."
    );
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/bookings");

  return { notice: `Booking marked ${status.replace("_", " ")}.` };
}
