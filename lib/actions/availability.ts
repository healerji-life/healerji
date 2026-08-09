"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHealerActor } from "@/lib/auth/session";
import {
  replaceRules, saveBookingSettings, replaceBreaks,
  addException, deleteException, blockDateRange,
} from "@/lib/services/availability";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import {
  validateSchedule, mergeRanges, normaliseTime, toMinutes,
  WEEKDAY_LABEL, type WeeklySchedule,
} from "@/lib/booking/schedule";

/**
 * Availability mutations.
 *
 * Authorisation is layered, and each layer is independent:
 *
 *   1. requireHealerActor() proves the caller is signed in and holds the healer
 *      role, and returns THEIR healer id.
 *   2. The healer id used for the write is that returned value — never a value
 *      from the form. A crafted POST containing another healer's id is simply
 *      ignored, because the id is not read from the payload.
 *   3. RLS on healer_availability_rules only permits rows where
 *      healer_id = current_healer_id(), so even a bug in (2) writes nothing.
 *   4. The database's exclusion constraint rejects overlapping windows
 *      regardless of what the validation above concluded.
 *
 * Every save revalidates /book and the healer's public profile, so a schedule
 * change reaches the public booking calendar on the next request rather than
 * whenever a cache happens to expire.
 */

export interface AvailabilityState {
  error?: string;
  notice?: string;
  /** Per-field issues, keyed "weekday-rangeIndex". */
  issues?: Record<string, string>;
}

function revalidateBookingSurfaces(healerSlug?: string) {
  revalidatePath("/book");
  revalidatePath("/healers");
  if (healerSlug) revalidatePath(`/healers/${healerSlug}`);
  revalidatePath("/healer/availability");
  revalidatePath("/healer/dashboard");
}

const rangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const scheduleSchema = z.array(
  z.object({
    weekday: z.number().int().min(0).max(6),
    ranges: z.array(rangeSchema).max(8),
  })
).max(7);

/**
 * Replaces the whole weekly pattern.
 *
 * Whole-week replacement rather than per-row edits is deliberate: it makes the
 * saved state exactly what the healer sees, with no possibility of an orphaned
 * row from a failed partial update.
 */
export async function saveWeeklyScheduleAction(
  _prev: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  let parsedSchedule: WeeklySchedule;
  try {
    const raw = JSON.parse(String(formData.get("schedule") ?? "[]"));
    const result = scheduleSchema.safeParse(raw);
    if (!result.success) return { error: "That schedule couldn't be read. Please reload and try again." };
    parsedSchedule = result.data;
  } catch {
    return { error: "That schedule couldn't be read. Please reload and try again." };
  }

  // Normalise before validating, so "9:00" and "09:00" behave identically.
  const normalised: WeeklySchedule = parsedSchedule.map((day) => ({
    weekday: day.weekday,
    ranges: day.ranges
      .map((r) => ({ start: normaliseTime(r.start), end: normaliseTime(r.end) }))
      .filter((r) => r.start !== "" && r.end !== ""),
  }));

  const issues = validateSchedule(normalised);
  if (issues.length > 0) {
    return {
      error: "Some windows need fixing before this can be saved.",
      issues: Object.fromEntries(issues.map((i) => [`${i.weekday}-${i.rangeIndex}`, i.message])),
    };
  }

  // Touching windows are merged so 09:00-13:00 plus 13:00-18:00 is stored once,
  // which the exclusion constraint would otherwise treat as adjacent-but-fine
  // and the slot grid would render as a seam.
  const rows = normalised.flatMap((day) =>
    mergeRanges(day.ranges).map((r) => ({
      weekday: day.weekday,
      start_time: `${r.start}:00`,
      end_time: `${r.end}:00`,
    }))
  );

  const saved = await replaceRules(actor.healerId, rows);
  if (!saved.ok) {
    return {
      error:
        saved.error.code === "conflict"
          ? "Two of those windows overlap. Please adjust them and save again."
          : "Couldn't save availability. Please try again.",
    };
  }

  await recordAudit({
    viewer: actor.viewer,
    action: AUDIT_ACTIONS.availabilityChanged,
    resourceType: "healer_availability",
    resourceId: actor.healerId,
    summary: `Updated weekly availability (${rows.length} windows)`,
    after: {
      windows: rows.map((r) => `${WEEKDAY_LABEL[r.weekday]} ${r.start_time}-${r.end_time}`),
    },
  });

  revalidateBookingSurfaces(actor.healerSlug);

  return {
    notice:
      rows.length === 0
        ? "Saved. Your calendar is now closed — no times will appear publicly."
        : "Saved. Your public booking calendar is updated.",
  };
}

// ------------------------------------------------------- booking settings ----

const settingsSchema = z.object({
  slotInterval: z.coerce.number().int().refine((v) => [15, 20, 30, 45, 60].includes(v), "Unsupported interval"),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  minNoticeMinutes: z.coerce.number().int().min(0).max(20160),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  maxSessionsPerDay: z.coerce.number().int().min(0).max(50),
  timezone: z.string().min(1).max(64),
  acceptingBookings: z.boolean(),
});

export async function saveBookingSettingsAction(
  _prev: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  const parsed = settingsSchema.safeParse({
    slotInterval: formData.get("slotInterval"),
    bufferMinutes: formData.get("bufferMinutes"),
    minNoticeMinutes: formData.get("minNoticeMinutes"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
    maxSessionsPerDay: formData.get("maxSessionsPerDay") ?? 0,
    timezone: formData.get("timezone"),
    acceptingBookings: formData.get("acceptingBookings") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check those settings." };
  }
  const v = parsed.data;

  // A timezone the runtime does not recognise would silently shift every slot,
  // so it is verified against the Intl database rather than trusted.
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: v.timezone });
  } catch {
    return { error: "That timezone isn't recognised. Please pick one from the list." };
  }

  const saved = await saveBookingSettings(actor.healerId, {
    slot_interval_minutes: v.slotInterval,
    buffer_minutes: v.bufferMinutes,
    min_notice_minutes: v.minNoticeMinutes,
    max_advance_days: v.maxAdvanceDays,
    max_sessions_per_day: v.maxSessionsPerDay,
    timezone: v.timezone,
    accepting_bookings: v.acceptingBookings,
  });

  if (!saved.ok) return { error: "Couldn't save those settings. Please try again." };

  await recordAudit({
    viewer: actor.viewer,
    action: AUDIT_ACTIONS.availabilityChanged,
    resourceType: "healer_booking_settings",
    resourceId: actor.healerId,
    summary: v.acceptingBookings ? "Updated booking settings" : "Closed calendar to new bookings",
    after: { ...v },
  });

  revalidateBookingSurfaces(actor.healerSlug);
  return { notice: "Saved. New bookings follow these rules from now on." };
}

// ---------------------------------------------------------------- breaks ----

export async function saveBreaksAction(
  _prev: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  const schema = z.array(
    z.object({
      label: z.string().max(60).nullable(),
      weekday: z.number().int().min(0).max(6).nullable(),
      start: z.string(),
      end: z.string(),
    })
  ).max(10);

  let parsed: z.infer<typeof schema>;
  try {
    const result = schema.safeParse(JSON.parse(String(formData.get("breaks") ?? "[]")));
    if (!result.success) return { error: "Those breaks couldn't be read." };
    parsed = result.data;
  } catch {
    return { error: "Those breaks couldn't be read." };
  }

  for (const b of parsed) {
    const start = toMinutes(b.start);
    const end = toMinutes(b.end);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return { error: "Each break needs a start time earlier than its end time." };
    }
  }

  const saved = await replaceBreaks(
    actor.healerId,
    parsed.map((b) => ({
      label: b.label && b.label.trim() !== "" ? b.label.trim() : null,
      weekday: b.weekday,
      start_time: `${normaliseTime(b.start)}:00`,
      end_time: `${normaliseTime(b.end)}:00`,
    }))
  );

  if (!saved.ok) return { error: "Couldn't save your breaks. Please try again." };

  revalidateBookingSurfaces(actor.healerSlug);
  return { notice: parsed.length === 0 ? "Breaks cleared." : "Breaks saved." };
}

// ------------------------------------------------------------ exceptions ----

export async function addExceptionAction(
  _prev: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  const mode = String(formData.get("mode") ?? "block");
  const onDate = String(formData.get("onDate") ?? "");
  const toDate = String(formData.get("toDate") ?? "");
  const reasonRaw = String(formData.get("reason") ?? "").trim();
  const reason = reasonRaw === "" ? null : reasonRaw.slice(0, 200);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(onDate)) {
    return { error: "Please choose a date." };
  }

  // ---- block a range of dates (holiday)
  if (mode === "block-range") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return { error: "Please choose an end date." };
    const result = await blockDateRange(actor.healerId, onDate, toDate, reason);
    if (!result.ok) {
      return { error: result.error.code === "validation" ? result.error.message : "Couldn't block those dates. Please try again." };
    }
    await recordAudit({
      viewer: actor.viewer,
      action: AUDIT_ACTIONS.availabilityChanged,
      resourceType: "availability_exception",
      resourceId: actor.healerId,
      summary: `Blocked ${result.data.inserted} day(s) from ${onDate}`,
    });
    revalidateBookingSurfaces(actor.healerSlug);
    return { notice: `Blocked ${result.data.inserted} day${result.data.inserted === 1 ? "" : "s"}.` };
  }

  // ---- block a whole single day
  if (mode === "block") {
    const result = await addException(actor.healerId, {
      kind: "unavailable",
      on_date: onDate,
      start_time: null,
      end_time: null,
      reason,
    });
    if (!result.ok) return { error: "Couldn't block that date. Please try again." };
    await recordAudit({
      viewer: actor.viewer,
      action: AUDIT_ACTIONS.availabilityChanged,
      resourceType: "availability_exception",
      resourceId: result.data.id,
      summary: `Blocked ${onDate}`,
    });
    revalidateBookingSurfaces(actor.healerSlug);
    return { notice: "That day is now blocked." };
  }

  // ---- open a one-off window outside the weekly pattern
  const start = normaliseTime(String(formData.get("startTime") ?? ""));
  const end = normaliseTime(String(formData.get("endTime") ?? ""));
  if (!start || !end || toMinutes(end) <= toMinutes(start)) {
    return { error: "Please give a start time earlier than the end time." };
  }

  const result = await addException(actor.healerId, {
    kind: "extra",
    on_date: onDate,
    start_time: `${start}:00`,
    end_time: `${end}:00`,
    reason,
  });
  if (!result.ok) return { error: "Couldn't add that time. Please try again." };

  await recordAudit({
    viewer: actor.viewer,
    action: AUDIT_ACTIONS.availabilityChanged,
    resourceType: "availability_exception",
    resourceId: result.data.id,
    summary: `Opened ${start}-${end} on ${onDate}`,
  });

  revalidateBookingSurfaces(actor.healerSlug);
  return { notice: "Extra time added for that date." };
}

export async function deleteExceptionAction(formData: FormData): Promise<void> {
  const actor = await requireHealerActor();
  if (!actor.ok) return;

  const id = String(formData.get("exceptionId") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await deleteException(actor.healerId, id);
  revalidateBookingSurfaces(actor.healerSlug);
}
