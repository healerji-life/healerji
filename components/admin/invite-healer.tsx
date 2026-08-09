"use client";

import { useActionState } from "react";
import { inviteHealerAction, type HealerFormState } from "@/lib/actions/healers";
import { SubmitButton, FormMessage } from "@/components/admin/form";

/**
 * Sends a Supabase Auth invitation.
 *
 * There is no password field here and there never will be: the healer sets
 * their own credential from the emailed link, so no administrator ever knows
 * or transports it.
 */
export function InviteHealerPanel({ healerId, origin }: { healerId: string; origin: string }) {
  const [state, formAction] = useActionState<HealerFormState, FormData>(inviteHealerAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={healerId} />
      <input type="hidden" name="origin" value={origin} />

      <p className="text-sm text-ink-600 dark:text-mist-400">
        Invite this healer to the portal so they can set their own availability.
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Their email</span>
        <input
          name="email"
          type="email"
          required
          className="h-11 w-full rounded-sm bg-surface-50 px-3.5 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <SubmitButton label="Send invitation" pendingLabel="Sending…" variant="secondary" />
    </form>
  );
}
