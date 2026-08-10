"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type AuthFormState } from "@/lib/auth/actions";

/**
 * Choosing a password for an account that does not have one yet.
 *
 * An invitation from Supabase creates the account without a credential, so the
 * person arrives with a valid session and nothing to sign in with next time.
 * This is where they get one. The session does the identifying — the form
 * carries no user id, so there is nothing here to tamper with.
 */
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-plum-900 text-[0.9375rem] font-medium text-surface-0 transition-colors hover:bg-plum-950 disabled:pointer-events-none disabled:opacity-40"
    >
      {pending ? "Saving…" : "Set password"}
    </button>
  );
}

export function SetPasswordForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(updatePassword, {});

  return (
    <form action={formAction} noValidate className="mt-8">
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">New password</span>
        <input
          name="password" type="password" required minLength={8} autoComplete="new-password"
          className="h-12 w-full rounded-sm bg-surface-50 px-4 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">Confirm password</span>
        <input
          name="confirm" type="password" required minLength={8} autoComplete="new-password"
          className="h-12 w-full rounded-sm bg-surface-50 px-4 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-error-700">{state.error}</p>
      ) : null}
      {state.notice ? (
        <p role="status" className="mt-4 text-sm text-ink-600 dark:text-mist-400">{state.notice}</p>
      ) : null}

      <Submit />

      <p className="mt-8 text-xs leading-relaxed text-ink-600 dark:text-mist-400">
        At least 8 characters. Nobody at HealerJi can see your password.
      </p>
    </form>
  );
}
