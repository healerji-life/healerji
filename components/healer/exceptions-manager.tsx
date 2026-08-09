"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addExceptionAction, deleteExceptionAction, type AvailabilityState,
} from "@/lib/actions/availability";
import { formatTime12, normaliseTime, timeOptions } from "@/lib/booking/schedule";
import { formatDate } from "@/lib/format";
import type { AvailabilityExceptionRow } from "@/lib/supabase/types";

/**
 * Dated exceptions: holidays, and one-off hours outside the weekly pattern.
 *
 * Blocking a whole day writes an 'unavailable' row with no times, which
 * get_available_slots treats as a full stop for that date. Adding extra hours
 * writes an 'extra' row, which is unioned with the weekly windows. Both are
 * existing behaviour in the slot generator — this is the UI for it.
 */

const TIME_OPTIONS = timeOptions(15);

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950 disabled:opacity-40"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function RemoveButton({ id }: { id: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Remove this exception"
      className="flex h-9 w-9 items-center justify-center rounded-full text-mist-500 transition-colors hover:bg-error-50 hover:text-error-700 disabled:opacity-40"
    >
      <span aria-hidden className="text-lg leading-none">&times;</span>
      <input type="hidden" name="exceptionId" value={id} />
    </button>
  );
}

export function ExceptionsManager({
  exceptions,
}: {
  exceptions: AvailabilityExceptionRow[];
}) {
  const [state, formAction] = useActionState<AvailabilityState, FormData>(addExceptionAction, {});
  const [mode, setMode] = useState<"block" | "block-range" | "extra">("block");

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const blocked = exceptions.filter((e) => e.kind === "unavailable");
  const extra = exceptions.filter((e) => e.kind === "extra");

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <div role="radiogroup" aria-label="Exception type" className="flex flex-wrap gap-2">
          {([
            { value: "block", label: "Block a day" },
            { value: "block-range", label: "Block a holiday" },
            { value: "extra", label: "Add extra hours" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              onClick={() => setMode(option.value)}
              className={
                mode === option.value
                  ? "h-10 rounded-full bg-plum-900 px-4 text-sm font-medium text-surface-0"
                  : "h-10 rounded-full px-4 text-sm hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {mode === "block-range" ? "From" : "Date"}
            </span>
            <input
              type="date"
              name="onDate"
              required
              min={minDate}
              className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            />
          </label>

          {mode === "block-range" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">To</span>
              <input
                type="date"
                name="toDate"
                required
                min={minDate}
                className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
              />
            </label>
          ) : null}

          {mode === "extra" ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">From</span>
                <select
                  name="startTime"
                  defaultValue="10:00"
                  className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm tabular-nums outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTime12(t)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Until</span>
                <select
                  name="endTime"
                  defaultValue="14:00"
                  className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm tabular-nums outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTime12(t)}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">
              Reason <span className="font-normal text-mist-500">optional, private to you</span>
            </span>
            <input
              type="text"
              name="reason"
              maxLength={200}
              placeholder={mode === "extra" ? "Extra clinic" : "Travelling"}
              className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            />
          </label>
        </div>

        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
            {state.error}
          </p>
        ) : null}
        {state.notice ? (
          <p role="status" className="rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
            {state.notice}
          </p>
        ) : null}

        <Submit
          label={
            mode === "extra" ? "Add extra hours"
              : mode === "block-range" ? "Block these dates"
              : "Block this day"
          }
        />
      </form>

      <div className="border-t border-mist-200/70 pt-6 dark:border-night-800">
        <h4 className="text-sm font-medium">Blocked dates</h4>
        {blocked.length === 0 ? (
          <p className="mt-2 text-sm text-mist-500">
            Nothing blocked. Your weekly hours apply on every date.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {blocked.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-sm bg-surface-50 px-3 py-2 dark:bg-night-950"
              >
                <span className="text-sm">
                  {formatDate(e.on_date)}
                  {e.reason ? <span className="ml-2 text-mist-500">· {e.reason}</span> : null}
                </span>
                <form action={deleteExceptionAction}>
                  <RemoveButton id={e.id} />
                </form>
              </li>
            ))}
          </ul>
        )}

        <h4 className="mt-6 text-sm font-medium">Extra hours</h4>
        {extra.length === 0 ? (
          <p className="mt-2 text-sm text-mist-500">
            None. Add hours here to open a date outside your usual pattern.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {extra.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-sm bg-surface-50 px-3 py-2 dark:bg-night-950"
              >
                <span className="text-sm">
                  {formatDate(e.on_date)}
                  {e.start_time && e.end_time ? (
                    <span className="ml-2 tabular-nums text-mist-500">
                      {formatTime12(normaliseTime(e.start_time))} – {formatTime12(normaliseTime(e.end_time))}
                    </span>
                  ) : null}
                </span>
                <form action={deleteExceptionAction}>
                  <RemoveButton id={e.id} />
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
