"use client";

import { useActionState } from "react";
import { saveBookingSettingsAction, type AvailabilityState } from "@/lib/actions/availability";
import { SubmitButton, FormMessage } from "@/components/admin/form";
import type { BookingSettingsRow } from "@/lib/supabase/types";

/**
 * Booking rules.
 *
 * Each control below is read by get_available_slots when it generates the public
 * calendar — none of it is decorative. The hints say what each one does in terms
 * of what a customer will see, because that is how a healer thinks about it.
 */

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London",
  "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney",
];

const NOTICE_OPTIONS = [
  { value: 0, label: "No minimum" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "1 day" },
  { value: 2880, label: "2 days" },
];

export function BookingRulesForm({ settings }: { settings: BookingSettingsRow | null }) {
  const [state, formAction] = useActionState<AvailabilityState, FormData>(
    saveBookingSettingsAction,
    {}
  );

  const s = settings;

  return (
    <form action={formAction} className="space-y-5">
      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <label className="flex items-start gap-3 rounded-sm bg-surface-50 p-4 dark:bg-night-950">
        <input
          type="checkbox"
          name="acceptingBookings"
          defaultChecked={s?.accepting_bookings ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#BE3A95]"
        />
        <span>
          <span className="block text-sm font-medium">Accepting bookings</span>
          <span className="mt-0.5 block text-xs text-mist-500">
            Turn this off and no times appear publicly, whatever your weekly hours
            say. Existing bookings are unaffected.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Slot spacing"
          name="slotInterval"
          defaultValue={String(s?.slot_interval_minutes ?? 30)}
          hint="How far apart start times are offered."
          options={[15, 20, 30, 45, 60].map((v) => ({ value: String(v), label: `Every ${v} minutes` }))}
        />

        <Select
          label="Buffer after a session"
          name="bufferMinutes"
          defaultValue={String(s?.buffer_minutes ?? 15)}
          hint="Protected time before the next session can start."
          options={[0, 5, 10, 15, 20, 30, 45, 60].map((v) => ({
            value: String(v),
            label: v === 0 ? "No buffer" : `${v} minutes`,
          }))}
        />

        <Select
          label="Minimum notice"
          name="minNoticeMinutes"
          defaultValue={String(s?.min_notice_minutes ?? 120)}
          hint="How soon before a session someone may still book it."
          options={NOTICE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
        />

        <Select
          label="How far ahead"
          name="maxAdvanceDays"
          defaultValue={String(s?.max_advance_days ?? 60)}
          hint="The furthest into the future your calendar opens."
          options={[7, 14, 30, 60, 90, 180, 365].map((v) => ({ value: String(v), label: `${v} days` }))}
        />

        <Select
          label="Daily cap"
          name="maxSessionsPerDay"
          defaultValue={String(s?.max_sessions_per_day ?? 0)}
          hint="A hard limit regardless of open hours. Protects against a heavy day."
          options={[0, 1, 2, 3, 4, 5, 6, 8, 10].map((v) => ({
            value: String(v),
            label: v === 0 ? "No limit" : `${v} sessions`,
          }))}
        />

        <Select
          label="Your timezone"
          name="timezone"
          defaultValue={s?.timezone ?? "Asia/Kolkata"}
          hint="Your hours are set in this zone; customers see their own."
          options={TIMEZONES.map((tz) => ({ value: tz, label: tz.replace("_", " ") }))}
        />
      </div>

      <SubmitButton label="Save booking rules" pendingLabel="Saving…" />
    </form>
  );
}

function Select({
  label, name, defaultValue, options, hint,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
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
