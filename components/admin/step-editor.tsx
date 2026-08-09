"use client";

import { useState } from "react";
import { practiceMinutesFromSteps, type PracticeStep } from "@/lib/content/practice";
import { cn } from "@/lib/utils";

/**
 * The practice step editor.
 *
 * A practice is followed with the eyes closed while breathing, so pacing is the
 * substance of the thing, not metadata. Each step carries its own duration and
 * the total is derived — an editor cannot claim nine minutes for a three-minute
 * practice, because the number is computed from what they typed.
 */

const DURATION_OPTIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180, 240, 300];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function StepEditor({
  name, initial, errors,
}: {
  name: string;
  initial: PracticeStep[];
  errors?: Record<string, string>;
}) {
  const [steps, setSteps] = useState<PracticeStep[]>(
    initial.length > 0 ? initial : [{ say: "", seconds: 45 }]
  );

  const totalSeconds = steps.reduce((sum, step) => sum + step.seconds, 0);

  function update(index: number, patch: Partial<PracticeStep>) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      const a = next[index]!;
      const b = next[target]!;
      next[index] = b;
      next[target] = a;
      return next;
    });
  }

  return (
    <div className="sm:col-span-2">
      {/* Steps travel as JSON: a nested list encoded as indexed form fields
          would break the moment anything is reordered. */}
      <input type="hidden" name={name} value={JSON.stringify(steps)} />

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Steps</span>
        <span className="text-xs text-mist-500">
          {steps.length} step{steps.length === 1 ? "" : "s"} ·{" "}
          <span className="tabular-nums">{formatDuration(totalSeconds)}</span> total ·
          card will read {practiceMinutesFromSteps(steps)} min
        </span>
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => {
          const sayError = errors?.[`steps.${index}`];
          return (
            <li key={index} className="rounded-sm bg-surface-50 p-3 dark:bg-night-950">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-center text-xs tabular-nums text-mist-500">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <label>
                    <span className="sr-only">Step {index + 1} guidance</span>
                    <textarea
                      rows={2}
                      value={step.say}
                      onChange={(e) => update(index, { say: e.target.value })}
                      placeholder="What the practitioner says at this moment…"
                      aria-invalid={Boolean(sayError)}
                      className={cn(
                        "w-full rounded-sm bg-white p-2.5 text-sm leading-relaxed outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900",
                        sayError && "ring-2 ring-error-700"
                      )}
                    />
                  </label>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-xs text-mist-500">
                      Hold for
                      <select
                        value={step.seconds}
                        onChange={(e) => update(index, { seconds: Number(e.target.value) })}
                        className="h-8 rounded-sm bg-white px-2 text-xs tabular-nums outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
                      >
                        {DURATION_OPTIONS.map((option) => (
                          <option key={option} value={option}>{formatDuration(option)}</option>
                        ))}
                      </select>
                    </label>

                    <span className="ml-auto flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move step ${index + 1} earlier`}
                        className="h-8 w-8 rounded-full text-mist-500 transition-colors hover:bg-ink-900/[0.05] disabled:opacity-30 dark:hover:bg-surface-0/[0.08]"
                      >
                        <span aria-hidden>&uarr;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === steps.length - 1}
                        aria-label={`Move step ${index + 1} later`}
                        className="h-8 w-8 rounded-full text-mist-500 transition-colors hover:bg-ink-900/[0.05] disabled:opacity-30 dark:hover:bg-surface-0/[0.08]"
                      >
                        <span aria-hidden>&darr;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSteps((c) => c.filter((_, i) => i !== index))}
                        disabled={steps.length === 1}
                        aria-label={`Remove step ${index + 1}`}
                        className="h-8 w-8 rounded-full text-mist-500 transition-colors hover:bg-error-50 hover:text-error-700 disabled:opacity-30"
                      >
                        <span aria-hidden className="text-lg leading-none">&times;</span>
                      </button>
                    </span>
                  </div>

                  {sayError ? (
                    <p role="alert" className="mt-1.5 text-xs text-error-700">{sayError}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => setSteps((c) => [...c, { say: "", seconds: 45 }])}
        className="mt-3 text-sm font-medium text-plum-900 underline-offset-4 hover:underline dark:text-orchid-200"
      >
        + Add a step
      </button>
    </div>
  );
}
