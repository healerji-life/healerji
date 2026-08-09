"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { AuthFormState } from "@/lib/auth/actions";

/**
 * The shared credentials form.
 *
 * Requirement 51: the submit button reports the real state of the request.
 * It is disabled while pending, and the success notice comes from the server
 * action's return value — never from an optimistic local flag.
 */

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-plum-900 text-[0.9375rem] font-medium text-surface-0 transition-colors duration-200 hover:bg-plum-950 disabled:pointer-events-none disabled:opacity-40 dark:bg-surface-0 dark:text-ink-900"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Field({
  label, name, type, autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className={cn(
          "h-12 w-full rounded-sm bg-surface-50 px-4 outline-none ring-orchid-500",
          "focus-visible:ring-2 dark:bg-night-950"
        )}
      />
    </label>
  );
}

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  origin,
  includeName = false,
  includePassword = true,
  next,
  autoComplete = "current-password",
}: {
  action: Action;
  submitLabel: string;
  pendingLabel: string;
  origin: string;
  includeName?: boolean;
  includePassword?: boolean;
  next?: string;
  autoComplete?: "current-password" | "new-password";
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="origin" value={origin} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {includeName ? (
        <Field label="Your name" name="fullName" type="text" autoComplete="name" />
      ) : null}

      <Field label="Email" name="email" type="email" autoComplete="email" />

      {includePassword ? (
        <Field label="Password" name="password" type="password" autoComplete={autoComplete} />
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-error-700">
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p role="status" className="mt-4 text-sm text-ink-600 dark:text-mist-400">
          {state.notice}
        </p>
      ) : null}

      <Submit label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
