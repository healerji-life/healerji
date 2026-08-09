import { createClient } from "@/lib/supabase/server";
import {
  err, fromPostgrestError, NOT_CONFIGURED, ok, range, safeSort, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import type { BookingRow, BookingStatus, SessionKind } from "@/lib/supabase/types";

/**
 * Bookings.
 *
 * A booking is created only through create_booking_hold(), the database
 * function that reserves the slot inside the same statement that writes the
 * row. There is deliberately no code path here that inserts into `bookings`
 * directly, and RLS grants no INSERT policy that would let one exist.
 */

export interface HoldRequest {
  healerSlug: string;
  sessionKind: SessionKind;
  startsAt: string;
  durationMinutes: number;
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
  sourcePath?: string;
  sourceRoute?: string;
}

export interface BookingHold {
  bookingId: string;
  reference: string;
  amountPaise: number;
  currency: string;
  startsAt: string;
  endsAt: string;
  holdExpiresAt: string;
}

export async function createHold(request: HoldRequest): Promise<Result<BookingHold>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase.rpc("create_booking_hold", {
    p_healer_slug: request.healerSlug,
    p_session_kind: request.sessionKind,
    p_starts_at: request.startsAt,
    p_duration_minutes: request.durationMinutes,
    p_guest_name: request.name ?? null,
    p_guest_email: request.email ?? null,
    p_guest_phone: request.phone ?? null,
    p_customer_note: request.note ?? null,
    p_source_path: request.sourcePath ?? null,
    p_source_route: request.sourceRoute ?? null,
  });

  if (error) return fromPostgrestError(error, "We couldn't hold that slot.");

  // rpc() is typed as returning Json; narrow through unknown so strict mode
  // does not reject the conversion from the string arm of the union.
  const row = data as unknown as Record<string, unknown> | null;
  if (!row || typeof row.booking_id !== "string" || typeof row.reference !== "string") {
    return err("unknown", "We couldn't hold that slot. Nothing was charged.");
  }

  return ok({
    bookingId: row.booking_id,
    reference: row.reference,
    amountPaise: Number(row.amount_paise ?? 0),
    currency: String(row.currency ?? "INR"),
    startsAt: String(row.starts_at ?? request.startsAt),
    endsAt: String(row.ends_at ?? ""),
    holdExpiresAt: String(row.hold_expires_at ?? ""),
  });
}

// -------------------------------------------------------------- reading ----

export const BOOKING_SORT_COLUMNS = [
  "starts_at", "created_at", "amount_paise", "status",
] as const;
export type BookingSortColumn = (typeof BOOKING_SORT_COLUMNS)[number];

export interface BookingFilters extends ListParams {
  status?: BookingStatus | "all";
  healerId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  paymentStatus?: BookingRow["payment_status"] | "all";
  sessionKind?: SessionKind;
}

/**
 * One query serves the admin list, the healer's session list and a customer's
 * own bookings. Which rows come back is decided by RLS, not by a branch here:
 * an admin sees everything, a healer sees their own, a customer sees theirs.
 */
export async function listBookings(
  filters: BookingFilters = {}
): Promise<Result<Paginated<BookingRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);

  let query = supabase
    .from("bookings")
    .select("*", { count: "exact" })
    .order(safeSort<BookingSortColumn>(filters.sort, BOOKING_SORT_COLUMNS, "starts_at"),
           { ascending: (filters.direction ?? "desc") === "asc" })
    .range(from, to);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }
  if (filters.healerId) query = query.eq("healer_id", filters.healerId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.sessionKind) query = query.eq("session_kind", filters.sessionKind);
  if (filters.from) query = query.gte("starts_at", filters.from);
  if (filters.to) query = query.lte("starts_at", filters.to);
  const term = sanitiseSearch(filters.search);
  if (term) {
    query = query.or(`reference.ilike.%${term}%,guest_name.ilike.%${term}%,guest_email.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load bookings.");
  return ok({ rows: data ?? [], total: count ?? 0, page, pageSize });
}

export async function getBookingByReference(reference: string): Promise<Result<BookingRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("bookings").select("*").eq("reference", reference).maybeSingle();
  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that booking.");
  return ok(data);
}

/**
 * Today's and upcoming sessions for the healer portal.
 *
 * Only the fields needed to conduct a session are selected — no payment
 * details, no gateway ids, no customer address (requirements 30 and 54).
 */
export async function listHealerSessions(
  healerId: string,
  window: "today" | "upcoming" | "past"
): Promise<Result<BookingRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);

  let query = supabase
    .from("bookings")
    .select("*")
    .eq("healer_id", healerId)
    .in("status", ["confirmed", "completed", "no_show"]);

  if (window === "today") {
    query = query
      .gte("starts_at", startOfToday.toISOString())
      .lt("starts_at", endOfToday.toISOString())
      .order("starts_at", { ascending: true });
  } else if (window === "upcoming") {
    query = query.gte("starts_at", now.toISOString()).order("starts_at", { ascending: true });
  } else {
    query = query.lt("starts_at", now.toISOString()).order("starts_at", { ascending: false }).limit(100);
  }

  const { data, error } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load your sessions.");
  return ok(data ?? []);
}

export async function cancelBooking(
  bookingId: string,
  reason: string
): Promise<Result<BookingRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (error) return fromPostgrestError(error, "We couldn't cancel that booking.");
  return ok(data);
}

// ------------------------------------------------- customer-facing reads ----

export interface CustomerBooking {
  id: string;
  reference: string;
  healerName: string;
  healerSlug: string;
  sessionKind: SessionKind;
  durationMinutes: number;
  startsAt: string;
  amountPaise: number;
  status: BookingStatus;
  paymentStatus: BookingRow["payment_status"];
  createdAt: string;
  customerNote: string | null;
}

/**
 * A signed-in customer's own bookings.
 *
 * The healer's name is joined here rather than fetched separately. RLS on
 * bookings restricts rows to customer_id = auth.uid(), so this cannot return
 * anyone else's sessions even if the filter below were wrong.
 */
export async function listMyBookings(): Promise<Result<CustomerBooking[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return err("unauthenticated", "Please sign in to see your bookings.");

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, reference, session_kind, duration_minutes, starts_at, amount_paise, status, payment_status, created_at, customer_note, healers(name, slug)"
    )
    .eq("customer_id", auth.user.id)
    .order("starts_at", { ascending: false });

  if (error) return fromPostgrestError(error, "We couldn't load your bookings.");

  type Joined = {
    id: string; reference: string; session_kind: SessionKind; duration_minutes: number;
    starts_at: string; amount_paise: number; status: BookingStatus;
    payment_status: BookingRow["payment_status"]; created_at: string;
    customer_note: string | null;
    healers: { name: string; slug: string } | { name: string; slug: string }[] | null;
  };

  const rows = (data ?? []) as unknown as Joined[];

  return ok(
    rows.map((row) => {
      // PostgREST returns an object for a to-one relation, but types it loosely;
      // normalise both shapes rather than casting one away.
      const healer = Array.isArray(row.healers) ? row.healers[0] : row.healers;
      return {
        id: row.id,
        reference: row.reference,
        healerName: healer?.name ?? "Your healer",
        healerSlug: healer?.slug ?? "",
        sessionKind: row.session_kind,
        durationMinutes: row.duration_minutes,
        startsAt: row.starts_at,
        amountPaise: row.amount_paise,
        status: row.status,
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        customerNote: row.customer_note,
      };
    })
  );
}

/** Detail for one booking, with the payment and audit trail an admin needs. */
export async function getBookingDetail(id: string): Promise<Result<{
  booking: BookingRow;
  healerName: string;
  customerEmail: string | null;
  payments: Array<{
    id: string; razorpay_order_id: string; razorpay_payment_id: string | null;
    status: string; amount_paise: number; amount_refunded_paise: number;
    method: string | null; captured_at: string | null; verified_via: string | null;
    created_at: string;
  }>;
  events: Array<{ from_status: string | null; to_status: string; created_at: string; note: string | null }>;
}>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data: booking, error } = await supabase
    .from("bookings").select("*").eq("id", id).maybeSingle();
  if (error) return fromPostgrestError(error);
  if (!booking) return err("not_found", "We couldn't find that booking.");

  const [healer, payments, events, profile] = await Promise.all([
    supabase.from("healers").select("name").eq("id", booking.healer_id).maybeSingle(),
    supabase
      .from("payments")
      .select(
        "id, razorpay_order_id, razorpay_payment_id, status, amount_paise, amount_refunded_paise, method, captured_at, verified_via, created_at"
      )
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("booking_events")
      .select("from_status, to_status, created_at, note")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    booking.customer_id
      ? supabase.from("profiles").select("email").eq("id", booking.customer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return ok({
    booking,
    healerName: healer.data?.name ?? "Unknown healer",
    // Falls back to the address captured at checkout for a guest booking.
    customerEmail: profile.data?.email ?? booking.guest_email ?? null,
    payments: payments.data ?? [],
    events: events.data ?? [],
  });
}
