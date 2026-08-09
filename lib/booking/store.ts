/**
 * DEPRECATED — kept only so no import dangles.
 *
 * Bookings used to be written to localStorage on the device after Razorpay's
 * browser handler fired. That meant a paid session existed only in one browser:
 * invisible to the healer, invisible to support, and gone when the cache was
 * cleared. Worse, the record was created on the strength of a client-side
 * callback, so it could be fabricated.
 *
 * Bookings are now created server-side by public.create_booking_hold() before
 * payment, and confirmed only when a server-verified Razorpay signature marks
 * the payment captured.
 *
 *   create   ->  POST /api/checkout        (reserves the slot, opens an order)
 *   confirm  ->  POST /api/booking/verify  (verifies the signature server-side)
 *   read     ->  lib/services/bookings.ts
 *
 * `newReference` is gone on purpose: references are allocated by the database
 * (public.generate_booking_reference) so they are unique across all devices.
 */

export type { BookingRow as BookingRecord } from "@/lib/supabase/types";
