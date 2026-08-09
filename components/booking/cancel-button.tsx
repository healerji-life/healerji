"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelMyBookingAction, type BookingActionState } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";

/**
 * Cancelling is destructive and irreversible, so it is two deliberate steps
 * with the refund consequence stated before the commitment — not after
 * (requirement 59: no one-click destructive actions).
 */
function Confirm({ hoursUntil }: { hoursUntil: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-error-700 px-6 text-[0.9375rem] font-medium text-surface-0 transition-colors hover:bg-error-800 disabled:opacity-40"
    >
      {pending
        ? "Cancelling…"
        : hoursUntil >= 24
          ? "Yes, cancel — full refund"
          : "Yes, cancel — no refund"}
    </button>
  );
}

export function CancelBookingButton({
  bookingId, reference, hoursUntil,
}: {
  bookingId: string;
  reference: string;
  hoursUntil: number;
}) {
  const [state, formAction] = useActionState<BookingActionState, FormData>(
    cancelMyBookingAction,
    {}
  );
  const [confirming, setConfirming] = useState(false);

  if (state.notice) {
    return (
      <p role="status" className="text-[0.9375rem] text-success-700">
        {state.notice}
      </p>
    );
  }

  if (!confirming) {
    return (
      <div>
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Cancel session
        </Button>
        {state.error ? (
          <p role="alert" className="mt-2 text-[0.875rem] text-error-700">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="rounded-sm bg-ink-900/[0.03] p-5 dark:bg-surface-0/[0.05]">
        <p className="text-[0.9375rem]">
          Cancel <span className="font-medium tabular-nums">{reference}</span>?
        </p>
        <p className="mt-1.5 text-[0.875rem] text-ink-600 dark:text-mist-400">
          {hoursUntil >= 24
            ? "More than 24 hours ahead, so this is refunded in full to your original payment method."
            : "Less than 24 hours ahead, so under the refund policy this is not refundable. Your healer has already held the time."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Confirm hoursUntil={hoursUntil} />
          <Button variant="secondary" type="button" onClick={() => setConfirming(false)}>
            Keep it
          </Button>
        </div>
        {state.error ? (
          <p role="alert" className="mt-3 text-[0.875rem] text-error-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
