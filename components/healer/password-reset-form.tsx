"use client";

import { useActionState } from "react";
import {
  requestHealerPasswordResetAction, type HealerSelfState,
} from "@/lib/actions/healer-self";
import { SubmitButton, FormMessage } from "@/components/admin/form";

/**
 * Password change by emailed link.
 *
 * There is no "current password" or "new password" field, on purpose: routing
 * this through Supabase means a hijacked portal session cannot change the
 * credential, because the link goes to the healer's mailbox.
 */
export function PasswordResetForm() {
  const [state, formAction] = useActionState<HealerSelfState, FormData>(
    requestHealerPasswordResetAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}
      <SubmitButton label="Email me a password reset link" pendingLabel="Sending…" variant="secondary" />
    </form>
  );
}
