"use client";

import { useActionState, useState, useMemo, useId } from "react";
import { useFormStatus } from "react-dom";
import { saveWeeklyScheduleAction, type AvailabilityState } from "@/lib/actions/availability";
import {
  WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABEL, timeOptions, formatTime12,
  validateDay, totalWeeklyHours, defaultWorkingWeek,
  type WeeklySchedule, type TimeRange,
} from "@/lib/booking/schedule";
import { cn } from "@/lib/utils";

/**
 * The weekly schedule editor.
 *
 * Mobile-first: one card per day, stacked, with controls large enough to hit
 * with a thumb. A healer changing tomorrow's hours between sessions on a phone
 * is the primary case, not an afterthought.
 *
 * Validation runs here as the healer types AND again in the server action,
 * using the same functions from lib/booking/schedule.ts — so the two cannot
 * drift. The database's exclusion constraint is the third and final check.
 *
 * Deliberately no animation: this is an operational form, and a window sliding
 * in makes it harder to see whether the time you just set is correct.
 */

const TIME_OPTIONS = timeOptions(15);

function SaveBar({ dirty, hours }: { dirty: boolean; hours: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-6 border-t border-mist-200/70 bg-surface-0/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6 dark:border-night-800 dark:bg-night-950/95">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600 dark:text-mist-400">
          {hours === 0 ? (
            <span className="text-warning-700">
              No hours set — your calendar will show nothing publicly.
            </span>
          ) : (
            <>
              <span className="font-medium tabular-nums">{hours}</span> hours a week
            </>
          )}
        </p>
        <button
          type="submit"
          disabled={pending || !dirty}
          aria-busy={pending}
          className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-plum-900 px-6 text-[0.9375rem] font-medium text-surface-0 transition-colors hover:bg-plum-950 disabled:pointer-events-none disabled:opacity-40"
        >
          {pending ? "Saving…" : dirty ? "Save schedule" : "Saved"}
        </button>
      </div>
    </div>
  );
}

export function ScheduleEditor({ initial }: { initial: WeeklySchedule }) {
  const [state, formAction] = useActionState<AvailabilityState, FormData>(
    saveWeeklyScheduleAction,
    {}
  );
  const [schedule, setSchedule] = useState<WeeklySchedule>(initial);
  const [dirty, setDirty] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);
  const formId = useId();

  const byDay = useMemo(
    () => new Map(schedule.map((d) => [d.weekday, d])),
    [schedule]
  );

  const localIssues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const day of schedule) {
      for (const issue of validateDay(day)) {
        map[`${issue.weekday}-${issue.rangeIndex}`] = issue.message;
      }
    }
    return map;
  }, [schedule]);

  // Server issues win once a save has been attempted: they are authoritative.
  const issues = { ...localIssues, ...(state.issues ?? {}) };
  const hasIssues = Object.keys(localIssues).length > 0;
  const hours = totalWeeklyHours(schedule);

  function update(next: WeeklySchedule) {
    setSchedule(next);
    setDirty(true);
    setCopiedFrom(null);
  }

  function setRanges(weekday: number, ranges: TimeRange[]) {
    update(schedule.map((d) => (d.weekday === weekday ? { ...d, ranges } : d)));
  }

  function addRange(weekday: number) {
    const day = byDay.get(weekday);
    const existing = day?.ranges ?? [];
    // Start the new window after the last one, so the common case needs no edit.
    const last = existing[existing.length - 1];
    const suggested: TimeRange = last
      ? { start: last.end, end: TIME_OPTIONS[Math.min(TIME_OPTIONS.indexOf(last.end) + 8, TIME_OPTIONS.length - 1)] ?? "18:00" }
      : { start: "09:00", end: "13:00" };
    setRanges(weekday, [...existing, suggested]);
  }

  function copyTo(from: number, targets: number[]) {
    const source = byDay.get(from)?.ranges ?? [];
    update(
      schedule.map((d) =>
        targets.includes(d.weekday) ? { ...d, ranges: source.map((r) => ({ ...r })) } : d
      )
    );
    setCopiedFrom(from);
  }

  return (
    <form action={formAction} id={formId}>
      {/* The schedule travels as JSON: it is a nested structure, and encoding it
          as dozens of indexed form fields would be fragile to reorder. */}
      <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />

      {state.error ? (
        <p role="alert" className="mb-4 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          {state.notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pb-5">
        <button
          type="button"
          onClick={() => update(defaultWorkingWeek())}
          className="h-10 rounded-full px-4 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
        >
          Use a standard week
        </button>
        <button
          type="button"
          onClick={() => update(schedule.map((d) => ({ ...d, ranges: [] })))}
          className="h-10 rounded-full px-4 text-sm hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-3">
        {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
          const day = byDay.get(weekday) ?? { weekday, ranges: [] };
          const available = day.ranges.length > 0;

          return (
            <li
              key={weekday}
              className="rounded-lg bg-white p-4 shadow-e-1 sm:p-5 dark:bg-night-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-[1.0625rem]">{WEEKDAY_LABEL[weekday]}</h3>
                  {!available ? (
                    <span className="rounded-full bg-mist-100 px-2.5 py-1 text-xs text-mist-700 dark:bg-night-800 dark:text-mist-300">
                      Unavailable
                    </span>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) =>
                      setRanges(
                        weekday,
                        e.target.checked ? [{ start: "09:00", end: "17:00" }] : []
                      )
                    }
                    className="h-4 w-4 accent-[#BE3A95]"
                    aria-label={`${WEEKDAY_LABEL[weekday]} available`}
                  />
                  Available
                </label>
              </div>

              {available ? (
                <>
                  <ul className="mt-4 space-y-2.5">
                    {day.ranges.map((range, index) => {
                      const issue = issues[`${weekday}-${index}`];
                      return (
                        <li key={index}>
                          <div className="flex flex-wrap items-center gap-2">
                            <TimeSelect
                              label={`${WEEKDAY_LABEL[weekday]} window ${index + 1} start`}
                              value={range.start}
                              invalid={Boolean(issue)}
                              onChange={(value) =>
                                setRanges(
                                  weekday,
                                  day.ranges.map((r, i) => (i === index ? { ...r, start: value } : r))
                                )
                              }
                            />
                            <span aria-hidden className="text-mist-500">–</span>
                            <TimeSelect
                              label={`${WEEKDAY_LABEL[weekday]} window ${index + 1} end`}
                              value={range.end}
                              invalid={Boolean(issue)}
                              onChange={(value) =>
                                setRanges(
                                  weekday,
                                  day.ranges.map((r, i) => (i === index ? { ...r, end: value } : r))
                                )
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setRanges(weekday, day.ranges.filter((_, i) => i !== index))
                              }
                              aria-label={`Remove ${WEEKDAY_LABEL[weekday]} window ${index + 1}`}
                              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-mist-500 transition-colors hover:bg-error-50 hover:text-error-700"
                            >
                              <span aria-hidden className="text-lg leading-none">&times;</span>
                            </button>
                          </div>
                          {issue ? (
                            <p role="alert" className="mt-1.5 text-xs text-error-700">
                              {issue}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <button
                      type="button"
                      onClick={() => addRange(weekday)}
                      className="text-sm font-medium text-plum-900 underline-offset-4 hover:underline dark:text-orchid-200"
                    >
                      + Add another time
                    </button>

                    <CopyMenu
                      from={weekday}
                      onCopy={copyTo}
                      copied={copiedFrom === weekday}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-mist-500">
                  No sessions on {WEEKDAY_LABEL[weekday]}s.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {hasIssues ? (
        <p role="alert" className="mt-4 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
          Fix the highlighted windows before saving.
        </p>
      ) : null}

      <SaveBar dirty={dirty && !hasIssues} hours={hours} />
    </form>
  );
}

/**
 * A native select of 15-minute options.
 *
 * Chosen over <input type="time"> deliberately: native time inputs are
 * inconsistent across browsers, awkward with keyboards, and allow arbitrary
 * minutes that would never align to a slot grid. A select is fully keyboard
 * operable, screen-reader friendly, and constrains the values to ones the
 * booking engine can actually use.
 */
function TimeSelect({
  label, value, onChange, invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn(
          "h-11 min-w-[104px] rounded-sm bg-surface-50 px-3 text-[0.9375rem] tabular-nums outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950",
          invalid && "ring-2 ring-error-700"
        )}
      >
        {TIME_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {formatTime12(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CopyMenu({
  from, onCopy, copied,
}: {
  from: number;
  onCopy: (from: number, targets: number[]) => void;
  copied: boolean;
}) {
  const [open, setOpen] = useState(false);
  const weekdays = [1, 2, 3, 4, 5];
  const all = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== from);

  if (copied) {
    return (
      <span role="status" className="text-sm text-success-700">
        Copied ✓
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-sm text-ink-600 underline-offset-4 hover:underline dark:text-mist-400"
      >
        Copy to…
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-sm bg-white py-1 shadow-e-2 dark:bg-night-800"
        >
          <MenuItem
            onClick={() => {
              onCopy(from, weekdays.filter((d) => d !== from));
              setOpen(false);
            }}
          >
            All weekdays (Mon–Fri)
          </MenuItem>
          <MenuItem
            onClick={() => {
              onCopy(from, all);
              setOpen(false);
            }}
          >
            Every other day
          </MenuItem>
          <div className="my-1 border-t border-mist-200/70 dark:border-night-700" />
          {all.map((target) => (
            <MenuItem
              key={target}
              onClick={() => {
                onCopy(from, [target]);
                setOpen(false);
              }}
            >
              {WEEKDAY_LABEL[target]}
            </MenuItem>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink-900/[0.04] dark:hover:bg-surface-0/[0.06]"
    >
      {children}
    </button>
  );
}
