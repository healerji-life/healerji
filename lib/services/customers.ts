import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  err, fromPostgrestError, NOT_CONFIGURED, ok, range, safeSort, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import type { AuthProvider, BookingStatus, SessionKind } from "@/lib/supabase/types";

/**
 * Customers.
 *
 * What is deliberately absent: password hashes, OAuth access or refresh tokens,
 * and anything Google returns beyond what an account needs. `auth_provider` and
 * `provider_account_id` are stored so support can answer "how does this person
 * sign in", not so we can act on their behalf elsewhere.
 *
 * RLS restricts profiles to `id = auth.uid() OR is_admin()` — note is_admin,
 * not is_staff, so an editor cannot read the customer list at all.
 */

export const CUSTOMER_SORT_COLUMNS = ["created_at", "last_sign_in_at", "email", "full_name"] as const;
export type CustomerSortColumn = (typeof CUSTOMER_SORT_COLUMNS)[number];

export interface CustomerFilters extends ListParams {
  provider?: AuthProvider | "all";
  status?: "active" | "suspended" | "archived" | "all";
}

export interface CustomerListRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  status: string;
  createdAt: string;
  lastSignInAt: string | null;
  bookingCount: number;
  totalSpendPaise: number;
  upcomingCount: number;
}

export async function listCustomers(
  filters: CustomerFilters = {}
): Promise<Result<Paginated<CustomerListRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);
  const sort = safeSort<CustomerSortColumn>(filters.sort, CUSTOMER_SORT_COLUMNS, "created_at");

  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, avatar_url, auth_provider, status, created_at, last_sign_in_at",
      { count: "exact" }
    )
    .order(sort, { ascending: (filters.direction ?? "desc") === "asc" })
    .range(from, to);

  if (filters.provider && filters.provider !== "all") query = query.eq("auth_provider", filters.provider);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const term = sanitiseSearch(filters.search);
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load customers.");

  const profiles = data ?? [];
  if (profiles.length === 0) return ok({ rows: [], total: count ?? 0, page, pageSize });

  /**
   * Booking aggregates for this page only.
   *
   * One query for the visible page rather than one per row — a customer list of
   * 25 must not become 26 round trips.
   */
  const ids = profiles.map((p) => p.id);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("customer_id, amount_paise, status, starts_at, payment_status")
    .in("customer_id", ids);

  const stats = new Map<string, { count: number; spend: number; upcoming: number }>();
  const now = Date.now();
  for (const b of bookings ?? []) {
    if (!b.customer_id) continue;
    const entry = stats.get(b.customer_id) ?? { count: 0, spend: 0, upcoming: 0 };
    entry.count += 1;
    // Spend counts money actually taken, not money quoted.
    if (b.payment_status === "paid" || b.payment_status === "partially_refunded") {
      entry.spend += b.amount_paise;
    }
    if (b.status === "confirmed" && new Date(b.starts_at).getTime() > now) entry.upcoming += 1;
    stats.set(b.customer_id, entry);
  }

  return ok({
    rows: profiles.map((p) => {
      const s = stats.get(p.id);
      return {
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        provider: p.auth_provider,
        status: p.status,
        createdAt: p.created_at,
        lastSignInAt: p.last_sign_in_at,
        bookingCount: s?.count ?? 0,
        totalSpendPaise: s?.spend ?? 0,
        upcomingCount: s?.upcoming ?? 0,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  });
}

export interface CustomerDetail {
  profile: CustomerListRow;
  bookings: Array<{
    id: string; reference: string; startsAt: string; status: BookingStatus;
    paymentStatus: string; amountPaise: number; sessionKind: SessionKind; healerName: string | null;
  }>;
  refundedPaise: number;
}

export async function getCustomerDetail(id: string): Promise<Result<CustomerDetail>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, auth_provider, status, created_at, last_sign_in_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!profile) return err("not_found", "We couldn't find that customer.");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, reference, starts_at, status, payment_status, amount_paise, session_kind, healers(name)")
    .eq("customer_id", id)
    .order("starts_at", { ascending: false });

  type Joined = {
    id: string; reference: string; starts_at: string; status: BookingStatus;
    payment_status: string; amount_paise: number; session_kind: SessionKind;
    healers: { name: string } | { name: string }[] | null;
  };
  const rows = (bookings ?? []) as unknown as Joined[];

  const now = Date.now();
  let spend = 0;
  let upcoming = 0;
  for (const b of rows) {
    if (b.payment_status === "paid" || b.payment_status === "partially_refunded") spend += b.amount_paise;
    if (b.status === "confirmed" && new Date(b.starts_at).getTime() > now) upcoming += 1;
  }

  return ok({
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      provider: profile.auth_provider,
      status: profile.status,
      createdAt: profile.created_at,
      lastSignInAt: profile.last_sign_in_at,
      bookingCount: rows.length,
      totalSpendPaise: spend,
      upcomingCount: upcoming,
    },
    bookings: rows.map((b) => {
      const healer = Array.isArray(b.healers) ? b.healers[0] : b.healers;
      return {
        id: b.id,
        reference: b.reference,
        startsAt: b.starts_at,
        status: b.status,
        paymentStatus: b.payment_status,
        amountPaise: b.amount_paise,
        sessionKind: b.session_kind,
        healerName: healer?.name ?? null,
      };
    }),
    refundedPaise: rows
      .filter((b) => b.payment_status === "refunded")
      .reduce((sum, b) => sum + b.amount_paise, 0),
  });
}
