"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button for a consequential action.
 *
 * The archive control used to be a bare <button> in a server-rendered form: no
 * pending state, no confirmation, and a redirect that lands somewhere the
 * change is not obvious. Production's audit log records nineteen successful
 * archives of the same healer inside forty-eight seconds — every one of them
 * worked, and the operator could not tell, so they kept clicking.
 *
 * Disabling while pending is the part that matters; the confirmation is there
 * because "Archive" beside "View public profile" is easy to hit by accident.
 */
export function ConfirmSubmit({
  label,
  pendingLabel,
  confirm,
  destructive = false,
}: {
  label: string;
  pendingLabel: string;
  confirm: string;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className={
        "inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 " +
        (destructive
          ? "text-error-700 hairline hover:bg-error-700/[0.06]"
          : "hairline hover:bg-ink-900/[0.035]")
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
