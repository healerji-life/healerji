"use client";

import { useActionState, useState } from "react";
import { updateBookingStatusAction, type BookingActionState } from "@/lib/actions/bookings";
import { SubmitButton, FormMessage } from "@/components/admin/form";

/**
 * Admin status change.
 *
 * Cancelling requires a reason and an explicit confirmation, because it is the
 * one transition here that a customer feels. Marking completed or no-show is
 * routine and needs neither.
 */
const OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
  { value: "cancelled", label: "Cancelled" },
];

export function BookingStatusForm({
  bookingId, current,
}: {
  bookingId: string;
  current: string;
}) {
  const [state, formAction] = useActionState<BookingActionState, FormData>(
    updateBookingStatusAction,
    {}
  );
  const [status, setStatus] = useState(current);
  const destructive = status === "cancelled" && current !== "cancelled";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Status</span>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Note {destructive ? "" : <span className="font-normal text-mist-500">optional</span>}
        </span>
        <textarea
          name="note"
          rows={3}
          required={destructive}
          placeholder={destructive ? "Why is this being cancelled?" : "Internal note"}
          className="w-full rounded-sm bg-surface-50 p-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      {destructive ? (
        <p className="rounded-sm bg-warning-50 px-3 py-2 text-xs text-warning-700">
          Cancelling frees the slot on the public calendar immediately. It does
          not issue a refund — do that in Razorpay, and it will appear here once
          the refund webhook arrives.
        </p>
      ) : null}

      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <SubmitButton
        label={destructive ? "Cancel booking" : "Update status"}
        pendingLabel="Saving…"
        variant={destructive ? "destructive" : "primary"}
      />
    </form>
  );
}
