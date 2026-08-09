"use client";

import { useActionState } from "react";
import { saveHealerAccountAction, type HealerSelfState } from "@/lib/actions/healer-self";
import { SubmitButton, FormMessage } from "@/components/admin/form";

export function HealerAccountForm({
  initial,
}: {
  initial: { fullName: string; phone: string; marketingOptIn: boolean };
}) {
  const [state, formAction] = useActionState<HealerSelfState, FormData>(
    saveHealerAccountAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your name</span>
        <input
          name="fullName"
          type="text"
          required
          defaultValue={initial.fullName}
          className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Phone <span className="font-normal text-mist-500">private to HealerJi</span>
        </span>
        <input
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="marketingOptIn"
          defaultChecked={initial.marketingOptIn}
          className="mt-0.5 h-4 w-4 accent-[#BE3A95]"
        />
        <span className="text-sm">
          Send me occasional HealerJi updates for healers
          <span className="mt-0.5 block text-xs text-mist-500">
            Booking emails are always sent, whatever you choose here.
          </span>
        </span>
      </label>

      <SubmitButton label="Save" pendingLabel="Saving…" variant="secondary" />
    </form>
  );
}
