/**
 * DEPRECATED — kept only so no import dangles.
 *
 * This module used to generate slots from an FNV hash of the healer slug and
 * date. That produced a stable-looking but entirely fictional calendar, and it
 * has been removed rather than left available to import by accident.
 *
 * Availability now comes from the database:
 *
 *   server code  ->  lib/services/availability.ts  (getAvailability)
 *   client code  ->  GET /api/booking/slots
 *   date helpers ->  lib/booking/window.ts
 *
 * The re-exports below are the pure helpers that were always safe; they now
 * live in lib/booking/window.ts. Nothing here computes availability.
 */
export {
  DURATIONS,
  PART_LABEL,
  DAY_PARTS,
  bookingWindow,
  toDateKey,
  partForHour,
  isDuration,
  type DayPart,
  type DayAvailability,
  type Duration,
  type Slot,
} from "@/lib/booking/window";
