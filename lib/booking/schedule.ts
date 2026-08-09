/**
 * Weekly-schedule vocabulary and validation.
 *
 * Pure and client-safe on purpose: the availability editor validates as the
 * healer types, and the server action validates the same payload again using
 * the same functions. One implementation, so the two can never disagree — and
 * the database still has its own `availability_rules_no_overlap` exclusion
 * constraint underneath as the final word.
 */

export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

/** Monday-first display order; the stored `weekday` still matches Postgres DOW. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LABEL: Record<number, string> = Object.fromEntries(
  WEEKDAYS.map((d) => [d.value, d.label])
);

export interface TimeRange {
  /** "HH:MM", 24-hour. */
  start: string;
  end: string;
}

export interface DaySchedule {
  weekday: number;
  ranges: TimeRange[];
}

export type WeeklySchedule = DaySchedule[];

// ------------------------------------------------------------------ time ----

/** Postgres returns "09:00:00"; the UI wants "09:00". */
export function normaliseTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function toMinutes(time: string): number {
  const normalised = normaliseTime(time);
  if (!normalised) return Number.NaN;
  const [h, m] = normalised.split(":");
  return Number(h) * 60 + Number(m);
}

/** "14:30" -> "2:30 pm", for confirmation copy. */
export function formatTime12(time: string): string {
  const minutes = toMinutes(time);
  if (Number.isNaN(minutes)) return time;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 15-minute options across the day, for the time selects. */
export function timeOptions(stepMinutes = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

// ------------------------------------------------------------ validation ----

export interface ScheduleIssue {
  weekday: number;
  /** Index within that day's ranges, or -1 when the issue is about the day. */
  rangeIndex: number;
  message: string;
}

/**
 * Validates one day's ranges.
 *
 * Overlap is the interesting case: 09:00-09:30 and 09:20-10:00 must be
 * rejected, because two overlapping windows would generate the same slot twice
 * and the database's exclusion constraint would refuse the write anyway — far
 * better to say so before the healer presses Save.
 */
export function validateDay(day: DaySchedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];

  day.ranges.forEach((range, index) => {
    const start = toMinutes(range.start);
    const end = toMinutes(range.end);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      issues.push({ weekday: day.weekday, rangeIndex: index, message: "Enter a valid start and end time." });
      return;
    }
    if (end <= start) {
      issues.push({ weekday: day.weekday, rangeIndex: index, message: "The end time must be after the start time." });
      return;
    }
    if (end - start < 15) {
      issues.push({ weekday: day.weekday, rangeIndex: index, message: "A window needs to be at least 15 minutes." });
    }
  });

  // Overlap check, comparing each pair once.
  const sorted = day.ranges
    .map((range, index) => ({ index, start: toMinutes(range.start), end: toMinutes(range.end) }))
    .filter((r) => !Number.isNaN(r.start) && !Number.isNaN(r.end) && r.end > r.start)
    .sort((a, b) => a.start - b.start);

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    if (current.start < previous.end) {
      issues.push({
        weekday: day.weekday,
        rangeIndex: current.index,
        message: "This overlaps another window on the same day.",
      });
    }
  }

  return issues;
}

export function validateSchedule(schedule: WeeklySchedule): ScheduleIssue[] {
  return schedule.flatMap(validateDay);
}

/** Merges touching or overlapping windows, so 09:00-13:00 + 13:00-18:00 becomes one. */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = ranges
    .map((r) => ({ start: toMinutes(r.start), end: toMinutes(r.end) }))
    .filter((r) => !Number.isNaN(r.start) && !Number.isNaN(r.end) && r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const fromMinutes = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  return merged.map((r) => ({ start: fromMinutes(r.start), end: fromMinutes(r.end) }));
}

export function emptySchedule(): WeeklySchedule {
  return WEEKDAYS.map((d) => ({ weekday: d.value, ranges: [] }));
}

/** A sensible starting pattern for the "set up my week" shortcut. */
export function defaultWorkingWeek(): WeeklySchedule {
  return WEEKDAYS.map((d) => ({
    weekday: d.value,
    ranges:
      d.value >= 1 && d.value <= 5
        ? [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }]
        : [],
  }));
}

export function totalWeeklyHours(schedule: WeeklySchedule): number {
  const minutes = schedule.reduce(
    (sum, day) =>
      sum +
      day.ranges.reduce((daySum, r) => {
        const start = toMinutes(r.start);
        const end = toMinutes(r.end);
        return Number.isNaN(start) || Number.isNaN(end) || end <= start ? daySum : daySum + (end - start);
      }, 0),
    0
  );
  return Math.round((minutes / 60) * 10) / 10;
}
