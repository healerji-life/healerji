import { createClient } from "@/lib/supabase/server";
import { err, fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";
import {
  partForHour, toDateKey, bookingWindow,
  type DayAvailability, type Duration, type Slot,
} from "@/lib/booking/window";
import type {
  AvailabilityRuleRow, AvailabilityExceptionRow, BookingSettingsRow, HealerBreakRow,
} from "@/lib/supabase/types";

/**
 * Availability.
 *
 * The public contract is intentionally the same shape the existing booking UI
 * already codes against (see lib/booking/availability.ts): an async lookup
 * returning day-parts of slots. What changed is the body — slots now come from
 * the database function get_available_slots(), which reads the healer's real
 * rules, breaks, holidays, buffer, notice period and existing bookings.
 */

export type { DayPart, Slot, DayAvailability, Duration } from "@/lib/booking/window";

export { toDateKey, bookingWindow, DURATIONS, PART_LABEL } from "@/lib/booking/window";

/**
 * Reads get_day_slots, which returns every published slot for the date with a
 * status, so the calendar can show a taken time as unavailable instead of
 * silently omitting it — an omitted slot leaves a customer unable to tell
 * "fully booked" from "not working that day".
 *
 * booked, blocked and past are deliberately collapsed into a single `blocked`
 * flag before this leaves the server. Which slots are taken is a healer's
 * private calendar and their booking volume; the customer only needs to know
 * the time cannot be chosen. get_available_slots remains the bookable set, and
 * bookings_no_overlap in the database is what actually prevents a double
 * booking — nothing here is a security boundary.
 */
export async function getAvailability(
  healerSlug: string,
  dateKey: string,
  duration: Duration = 45
): Promise<Result<DayAvailability>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase.rpc("get_day_slots", {
    p_healer_slug: healerSlug,
    p_date: dateKey,
    p_duration_minutes: duration,
  });

  if (error) return fromPostgrestError(error, "We couldn't load availability.");

  const rows = data ?? [];
  const slots: Slot[] = rows.map((row) => {
    const start = new Date(row.starts_at);
    return {
      id: row.starts_at,
      label: start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
      part: partForHour(start.getHours()),
      minutes: duration,
      blocked: row.status !== "available",
    };
  });

  const openCount = slots.filter((s) => !s.blocked).length;

  return ok({
    date: dateKey,
    slots,
    openCount,
    // No rows at all means the healer does not work that date. Rows with none
    // open means they do, and the day is full — two different messages.
    unconfigured: slots.length === 0,
  });
}

// ------------------------------------------------------- healer portal ----

export async function getRules(healerId: string): Promise<Result<AvailabilityRuleRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("healer_availability_rules")
    .select("*")
    .eq("healer_id", healerId)
    .order("weekday").order("start_time");
  if (error) return fromPostgrestError(error);
  return ok(data ?? []);
}

/**
 * Replace a healer's weekly pattern.
 *
 * `healerId` is passed explicitly but is not what makes this safe: the RLS
 * policy on healer_availability_rules only permits rows where
 * healer_id = current_healer_id(), so a healer sending someone else's id gets
 * a permission error from Postgres, not a silent write.
 */
export async function replaceRules(
  healerId: string,
  rules: Array<Pick<AvailabilityRuleRow, "weekday" | "start_time" | "end_time">>
): Promise<Result<AvailabilityRuleRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error: delError } = await supabase
    .from("healer_availability_rules").delete().eq("healer_id", healerId);
  if (delError) return fromPostgrestError(delError, "We couldn't update your availability.");

  if (rules.length === 0) return ok([]);

  const { data, error } = await supabase
    .from("healer_availability_rules")
    .insert(rules.map((r) => ({ ...r, healer_id: healerId })))
    .select("*");

  if (error) return fromPostgrestError(error, "We couldn't save those hours — check for overlaps.");
  return ok(data ?? []);
}

export async function getExceptions(
  healerId: string,
  fromDate: string,
  toDate: string
): Promise<Result<AvailabilityExceptionRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("*")
    .eq("healer_id", healerId)
    .gte("on_date", fromDate)
    .lte("on_date", toDate)
    .order("on_date");
  if (error) return fromPostgrestError(error);
  return ok(data ?? []);
}

export async function addException(
  healerId: string,
  exception: Omit<AvailabilityExceptionRow, "id" | "healer_id" | "created_at">
): Promise<Result<AvailabilityExceptionRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("availability_exceptions")
    .insert({ ...exception, healer_id: healerId })
    .select("*").single();
  if (error) return fromPostgrestError(error, "We couldn't save that.");
  return ok(data);
}

export async function getBookingSettings(healerId: string): Promise<Result<BookingSettingsRow | null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("healer_booking_settings").select("*").eq("healer_id", healerId).maybeSingle();
  if (error) return fromPostgrestError(error);
  return ok(data ?? null);
}

export async function saveBookingSettings(
  healerId: string,
  patch: Partial<BookingSettingsRow>
): Promise<Result<BookingSettingsRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("healer_booking_settings")
    .upsert({ ...patch, healer_id: healerId }, { onConflict: "healer_id" })
    .select("*").single();
  if (error) return fromPostgrestError(error, "We couldn't save those settings.");
  return ok(data);
}

// -------------------------------------------------- breaks and exceptions ----

/**
 * Recurring breaks. `weekday === null` means every working day.
 *
 * These are subtracted from the generated grid by get_available_slots, so a
 * 13:00-14:00 break removes those slots without the healer having to split
 * every window in two.
 */
export async function getBreaks(healerId: string): Promise<Result<HealerBreakRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("healer_breaks")
    .select("*")
    .eq("healer_id", healerId)
    .order("start_time");
  if (error) return fromPostgrestError(error);
  return ok(data ?? []);
}

export async function replaceBreaks(
  healerId: string,
  breaks: Array<{ label: string | null; weekday: number | null; start_time: string; end_time: string }>
): Promise<Result<HealerBreakRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error: delError } = await supabase
    .from("healer_breaks").delete().eq("healer_id", healerId);
  if (delError) return fromPostgrestError(delError, "We couldn't update your breaks.");

  if (breaks.length === 0) return ok([]);

  const { data, error } = await supabase
    .from("healer_breaks")
    .insert(breaks.map((b) => ({ ...b, healer_id: healerId })))
    .select("*");

  if (error) return fromPostgrestError(error, "We couldn't save those breaks.");
  return ok(data ?? []);
}

export async function deleteException(healerId: string, exceptionId: string): Promise<Result<null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  // healer_id is in the filter as well as the id: RLS already restricts this to
  // the owning healer, but scoping the delete makes the intent explicit and
  // means a wrong id cannot touch another healer's row even in a future
  // refactor that loosened the policy.
  const { error } = await supabase
    .from("availability_exceptions")
    .delete()
    .eq("id", exceptionId)
    .eq("healer_id", healerId);

  if (error) return fromPostgrestError(error, "We couldn't remove that exception.");
  return ok(null);
}

/**
 * Blocks every date in a range, inclusive.
 *
 * One row per date rather than a stored range: get_available_slots looks up
 * exceptions by exact date, and a per-date row means the healer can unblock a
 * single day out of a holiday without recreating the rest.
 */
export async function blockDateRange(
  healerId: string,
  fromDate: string,
  toDate: string,
  reason: string | null
): Promise<Result<{ inserted: number }>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return err("validation", "Please choose a valid date range.");
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > 120) {
    return err("validation", "Please block at most 120 days at a time.");
  }

  const rows: Array<{
    healer_id: string; kind: "unavailable"; on_date: string; reason: string | null;
  }> = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    rows.push({
      healer_id: healerId,
      kind: "unavailable",
      on_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      reason,
    });
  }

  const { error } = await supabase.from("availability_exceptions").insert(rows);
  if (error) return fromPostgrestError(error, "We couldn't block those dates.");
  return ok({ inserted: rows.length });
}
