"use client";

import { useActionState, useState } from "react";
import {
  changeUserRoleAction, setUserStatusAction, inviteUserAction, type UserActionState,
} from "@/lib/actions/users";
import { SubmitButton, FormMessage } from "@/components/admin/form";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/auth/roles";

/**
 * Role and status controls.
 *
 * These are rendered only for a super admin — the server checks the same
 * permission again, and the database refuses regardless, so hiding them is
 * courtesy rather than security.
 *
 * Role changes are two-step: the form must be opened, then submitted. Granting
 * admin is not something that should happen from a stray click in a table.
 */
export function RoleControls({
  userId, currentRoles, isSelf,
}: {
  userId: string;
  currentRoles: Role[];
  isSelf: boolean;
}) {
  const [state, formAction] = useActionState<UserActionState, FormData>(changeUserRoleAction, {});
  const [open, setOpen] = useState(false);

  if (isSelf) {
    return (
      <p className="text-xs text-mist-500">
        Your own account — roles must be changed by another super admin.
      </p>
    );
  }

  const assignable = ROLES.filter((r) => r !== "healer");

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-8 rounded-full px-3 text-xs font-medium hairline transition-colors hover:bg-ink-900/[0.04] dark:hover:bg-surface-0/[0.06]"
        >
          Change roles
        </button>
        {state.notice ? (
          <p role="status" className="mt-1.5 text-xs text-success-700">{state.notice}</p>
        ) : null}
        {state.error ? (
          <p role="alert" className="mt-1.5 text-xs text-error-700">{state.error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-sm bg-surface-50 p-3 dark:bg-night-950">
      <input type="hidden" name="userId" value={userId} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium">Role</span>
        <select
          name="role"
          className="h-9 w-full rounded-sm bg-white px-2 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
        >
          {assignable.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
              {currentRoles.includes(role) ? " (has)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium">Action</span>
        <select
          name="mode"
          className="h-9 w-full rounded-sm bg-white px-2 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
        >
          <option value="grant">Grant</option>
          <option value="revoke">Revoke</option>
        </select>
      </label>

      <p className="text-[0.6875rem] leading-snug text-mist-500">
        Granting admin or super admin requires super admin, and the database
        refuses any change to your own roles.
      </p>

      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <div className="flex gap-2">
        <SubmitButton label="Apply" pendingLabel="Saving…" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 rounded-full px-4 text-sm hairline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function StatusControls({
  userId, status, isSelf,
}: {
  userId: string;
  status: string;
  isSelf: boolean;
}) {
  const [state, formAction] = useActionState<UserActionState, FormData>(setUserStatusAction, {});
  const [confirming, setConfirming] = useState(false);

  if (isSelf) return <span className="text-xs text-mist-500">—</span>;

  const suspending = status === "active";

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="h-8 rounded-full px-3 text-xs font-medium hairline transition-colors hover:bg-ink-900/[0.04] dark:hover:bg-surface-0/[0.06]"
        >
          {suspending ? "Suspend" : "Reactivate"}
        </button>
        {state.notice ? (
          <p role="status" className="mt-1.5 text-xs text-success-700">{state.notice}</p>
        ) : null}
        {state.error ? (
          <p role="alert" className="mt-1.5 text-xs text-error-700">{state.error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-sm bg-surface-50 p-3 dark:bg-night-950">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={suspending ? "suspended" : "active"} />
      <p className="text-xs">
        {suspending
          ? "Suspending signs them out of every portal and blocks sign-in. Their records are kept."
          : "Reactivating restores portal access immediately."}
      </p>
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-error-700">{state.error}</p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <SubmitButton
          label={suspending ? "Suspend account" : "Reactivate"}
          pendingLabel="Saving…"
          variant={suspending ? "destructive" : "primary"}
        />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-11 rounded-full px-4 text-sm hairline"
        >
          Keep as is
        </button>
      </div>
    </form>
  );
}

export function InviteUserForm() {
  const [state, formAction] = useActionState<UserActionState, FormData>(inviteUserAction, {});

  return (
    <form action={formAction} className="grid gap-3 px-6 py-5 sm:grid-cols-[1fr_180px_auto] sm:items-end">

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@healerji.com"
          className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Role</span>
        <select
          name="role"
          defaultValue="editor"
          className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </label>

      <SubmitButton label="Send invitation" pendingLabel="Sending…" />

      <div className="sm:col-span-3">
        {state.error || state.notice ? (
          <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
        ) : (
          <p className="text-xs text-mist-500">
            They set their own password from the emailed link. Healers are invited
            from the Healers screen instead, so the account links to their profile.
          </p>
        )}
      </div>
    </form>
  );
}
