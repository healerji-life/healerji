/**
 * Booking primitives — pure, client-safe, no I/O.
 *
 * This module exists to break a real dependency problem: the booking calendar
 * is a client component, but lib/services/availability.ts reaches for cookies
 * via the Supabase server client. Importing the service into the calendar would
 * pull `next/headers` into the browser bundle.
 *
 * So the shared vocabulary (date keys, the booking window, slot shapes) lives
 * here, and both the client UI and the server service import it. One definition,
 * no duplication, no casts.
 */

export type DayPart = "morning" | "afternoon" | "evening";

export interface Slot {
  /** ISO start time, and the value posted back to the server. */
  id: string;
  label: string;
  part: DayPart;
  minutes: number;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
  openCount: number;
  /**
   * True when the healer has published no schedule at all. Distinct from
   * "fully booked", and worded differently on screen — one is the healer's
   * doing, the other is other customers'.
   */
  unconfigured: boolean;
}

export const DURATIONS = [30, 45, 60] as const;
export type Duration = (typeof DURATIONS)[number];

export const PART_LABEL: Record<DayPart, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const DAY_PARTS: DayPart[] = ["morning", "afternoon", "evening"];

export function partForHour(hour: number): DayPart {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/** Local YYYY-MM-DD. Deliberately not toISOString(), which would shift the day. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The window the calendar allows booking within. The authoritative limit is
 * each healer's own max_advance_days, enforced in get_available_slots(); this
 * is only how far the month grid lets someone navigate.
 */
export function bookingWindow(maxAdvanceDays = 60): { first: Date; last: Date } {
  const first = new Date();
  first.setHours(0, 0, 0, 0);
  const last = new Date(first);
  last.setDate(last.getDate() + maxAdvanceDays);
  return { first, last };
}

export function isDuration(value: unknown): value is Duration {
  return typeof value === "number" && (DURATIONS as readonly number[]).includes(value);
}
