"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** Shared admin form controls. */

export function Fieldset({
  legend, description, children, columns = 2,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <fieldset className="border-b border-mist-200/70 px-6 py-6 last:border-0 dark:border-night-800">
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div>
          <h3 className="font-display text-[1rem]">{legend}</h3>
          {description ? <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">{description}</p> : null}
        </div>
        <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>{children}</div>
      </div>
    </fieldset>
  );
}

export function Field({
  label, name, type = "text", defaultValue, hint, error, required, placeholder, min, max, step, span,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  hint?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  span?: boolean;
}) {
  return (
    <label className={cn("block", span && "sm:col-span-2")}>
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span aria-hidden className="text-orchid-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 w-full rounded-sm bg-surface-50 px-3.5 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950",
          error && "ring-2 ring-error-700"
        )}
      />
      {error ? <span className="mt-1 block text-xs text-error-700">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-mist-500">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label, name, defaultValue, rows = 5, hint, error, maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-sm bg-surface-50 p-3.5 text-sm leading-relaxed outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950",
          error && "ring-2 ring-error-700"
        )}
      />
      {error ? <span className="mt-1 block text-xs text-error-700">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-mist-500">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label, name, defaultValue, options, hint, span,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  hint?: string;
  span?: boolean;
}) {
  return (
    <label className={cn("block", span && "sm:col-span-2")}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? undefined}
        className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint ? <span className="mt-1 block text-xs text-mist-500">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  label, name, defaultChecked, hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-sm bg-surface-50 p-3.5 dark:bg-night-950">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#BE3A95]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-mist-500">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Multi-select rendered as checkboxes — all options visible, no hidden state. */
export function CheckboxGroup({
  label, name, options, selected, hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  hint?: string;
}) {
  const chosen = new Set(selected);
  return (
    <div className="sm:col-span-2">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {hint ? <p className="mb-2 text-xs text-mist-500">{hint}</p> : null}
      {options.length === 0 ? (
        <p className="text-xs text-mist-500">
          None available — seed the reference tables first.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-50 px-3.5 py-2 text-sm transition-colors hover:bg-surface-100 has-[:checked]:bg-orchid-500/[0.12] has-[:checked]:text-plum-900 dark:bg-night-950 dark:has-[:checked]:text-orchid-200"
            >
              <input
                type="checkbox"
                name={name}
                value={o.value}
                defaultChecked={chosen.has(o.value)}
                className="h-3.5 w-3.5 accent-[#BE3A95]"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Submit button. Disabled while the action is in flight, and the label reports
 * the real state — it never says "Saved" before the server has answered.
 */
export function SubmitButton({
  label, pendingLabel, variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "destructive";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-plum-900 text-surface-0 hover:bg-plum-950",
    secondary: "hairline hover:bg-ink-900/[0.035]",
    destructive: "bg-error-700 text-surface-0 hover:bg-error-800",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        styles[variant]
      )}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function FormMessage({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-sm px-4 py-3 text-sm",
        error ? "bg-error-50 text-error-700" : "bg-success-50 text-success-700"
      )}
    >
      {error ?? notice}
    </p>
  );
}
