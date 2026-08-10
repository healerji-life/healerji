"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthFormState } from "@/lib/auth/actions";

/**
 * Portal sign-in, shared by /admin/login and /healer/login.
 *
 * This form authenticates. It does not authorise: whether the person may see
 * anything behind it is decided by middleware, by requireAdmin()/requireHealer()
 * on each page, and finally by Row Level Security. Signing in successfully with
 * a customer account gets you back to this page with "forbidden".
 */

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

const REASONS: Record<string, string> = {
  forbidden: "That account doesn't have access to this portal.",
  unconfigured: "This portal isn't configured on this deployment yet.",
  suspended: "That account is not active. Please contact HealerJi.",
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-plum-900 text-[0.9375rem] font-medium text-surface-0 transition-colors hover:bg-plum-950 disabled:pointer-events-none disabled:opacity-40"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function PortalLogin({
  action,
  title,
  subtitle,
  next,
  reason,
  }: {
  action: Action;
  title: string;
  subtitle: string;
  next: string;
  reason?: string;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});
  const reasonMessage = reason ? REASONS[reason] : undefined;

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="font-display text-[0.6875rem] uppercase tracking-[0.18em] text-orchid-500">
        HealerJi Operations
      </p>
      <h1 className="mt-3 font-display text-[2rem] leading-tight text-ink-900 dark:text-surface-0">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-mist-400">{subtitle}</p>

      {reasonMessage ? (
        <p role="alert" className="mt-6 rounded-sm border-l-2 border-orchid-500 bg-surface-50 p-4 text-sm dark:bg-night-950">
          {reasonMessage}
        </p>
      ) : null}

      <form action={formAction} noValidate className="mt-8">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email</span>
          <input
            name="email" type="email" required autoComplete="email"
            className="h-12 w-full rounded-sm bg-surface-50 px-4 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Password</span>
          <input
            name="password" type="password" required autoComplete="current-password"
            className="h-12 w-full rounded-sm bg-surface-50 px-4 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />
        </label>

        {state.error ? (
          <p role="alert" className="mt-4 text-sm text-error-700">{state.error}</p>
        ) : null}

        <Submit />
      </form>

      <p className="mt-8 text-xs leading-relaxed text-ink-600 dark:text-mist-400">
        Accounts are created by invitation. HealerJi never asks for your password
        by email, and no administrator can see it.
      </p>
    </div>
  );
}
