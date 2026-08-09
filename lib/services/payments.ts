import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";
import { isConfigured } from "@/lib/services/integrations";
import type { PaymentRow } from "@/lib/supabase/types";

/**
 * Payments.
 *
 * Two rules govern this module, and every function here exists to enforce one
 * of them:
 *
 *   1. A payment is only ever marked successful by a signature this server
 *      verified. The browser reporting success proves nothing (requirement 16).
 *   2. Webhooks are idempotent. Razorpay retries; a replayed event must not
 *      double-count revenue or re-confirm a cancelled booking.
 *
 * All writes use the service role because a customer must not be able to write
 * their own payment row — RLS grants no client INSERT on `payments` at all.
 */

/** Razorpay's documented handler scheme: HMAC-SHA256 of "order_id|payment_id". */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return timingSafeEqualHex(params.signature, expected);
}

/** Webhook scheme: HMAC-SHA256 of the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(signature, expected);
}

/**
 * Constant-time compare. Buffer.from on differing lengths would make
 * timingSafeEqual throw, so length is checked first — that leaks only the
 * length of a hash whose length is fixed and public anyway.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export async function recordOrderCreated(params: {
  bookingId: string;
  orderId: string;
  amountPaise: number;
  currency?: string;
}): Promise<Result<PaymentRow>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { data, error } = await admin
    .from("payments")
    .upsert(
      {
        booking_id: params.bookingId,
        razorpay_order_id: params.orderId,
        amount_paise: params.amountPaise,
        currency: params.currency ?? "INR",
        status: "created",
      },
      { onConflict: "provider,razorpay_order_id" }
    )
    .select("*")
    .single();

  if (error) return fromPostgrestError(error, "We couldn't record that order.");
  return ok(data);
}

/**
 * Called from the browser handler after checkout closes. The signature is
 * verified here before anything is written; an invalid one is a hard failure
 * and never a "probably fine".
 */
export async function confirmPaymentFromHandler(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<Result<PaymentRow>> {
  if (!isConfigured("razorpay")) return NOT_CONFIGURED("Razorpay");

  if (!verifyPaymentSignature(params)) {
    return err("forbidden", "That payment could not be verified.");
  }

  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { data, error } = await admin
    .from("payments")
    .update({
      razorpay_payment_id: params.paymentId,
      razorpay_signature: params.signature,
      status: "captured",
      verified_via: "handler",
      verified_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", params.orderId)
    .select("*")
    .single();

  if (error) return fromPostgrestError(error, "We couldn't confirm that payment.");
  // The sync_booking_payment_status trigger moves the booking to confirmed.
  return ok(data);
}

/**
 * Webhook ingestion. Returns `duplicate: true` when the event has been seen
 * before, which the route handler should answer 200 to — Razorpay treats a
 * non-200 as a failure and retries harder.
 */
export async function ingestWebhookEvent(params: {
  eventId: string;
  eventType: string;
  rawBody: string;
  signature: string;
}): Promise<Result<{ duplicate: boolean; signatureValid: boolean }>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const signatureValid = verifyWebhookSignature(params.rawBody, params.signature);

  let payload: unknown;
  try {
    payload = JSON.parse(params.rawBody);
  } catch {
    return err("validation", "Malformed webhook body.");
  }

  // An invalid signature is still recorded, unprocessed. Forged attempts are
  // worth seeing in the audit trail.
  const { error } = await admin.from("webhook_events").insert({
    event_id: params.eventId,
    event_type: params.eventType,
    signature_valid: signatureValid,
    payload: payload as never,
  });

  if (error) {
    if (error.code === "23505") return ok({ duplicate: true, signatureValid });
    return fromPostgrestError(error, "We couldn't record that webhook.");
  }

  return ok({ duplicate: false, signatureValid });
}

export async function markWebhookProcessed(
  eventId: string,
  processingError?: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_error: processingError ?? null,
    })
    .eq("event_id", eventId);
}

export async function applyCapturedPayment(params: {
  orderId: string;
  paymentId: string;
  method?: string;
  feePaise?: number;
  taxPaise?: number;
}): Promise<Result<null>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { error } = await admin
    .from("payments")
    .update({
      razorpay_payment_id: params.paymentId,
      status: "captured",
      method: params.method ?? null,
      fee_paise: params.feePaise ?? null,
      tax_paise: params.taxPaise ?? null,
      verified_via: "webhook",
      verified_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", params.orderId);

  if (error) return fromPostgrestError(error);
  return ok(null);
}

export async function applyFailedPayment(params: {
  orderId: string;
  paymentId?: string;
  errorCode?: string;
  errorDescription?: string;
}): Promise<Result<null>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { error } = await admin
    .from("payments")
    .update({
      razorpay_payment_id: params.paymentId ?? null,
      status: "failed",
      error_code: params.errorCode ?? null,
      error_description: params.errorDescription ?? null,
      verified_via: "webhook",
      verified_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", params.orderId);

  if (error) return fromPostgrestError(error);
  return ok(null);
}

/**
 * Releases a hold whose payment never started.
 *
 * Uses the service role deliberately: the holder may be a guest with no
 * session, so there is no signed-in identity that RLS would let update the
 * row. Setting status to 'expired' takes it out of the exclusion constraint's
 * WHERE clause, which returns the slot to the calendar immediately rather than
 * leaving it blocked until hold_expires_at passes.
 */
export async function releaseHold(bookingId: string, reason: string): Promise<Result<null>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { error } = await admin
    .from("bookings")
    .update({
      status: "expired",
      cancellation_reason: `hold released: ${reason}`,
      hold_expires_at: null,
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment");   // never touch a booking that got paid

  if (error) return fromPostgrestError(error);
  return ok(null);
}

/**
 * Applies a Razorpay webhook event to our own records.
 *
 * Called only after ingestWebhookEvent() has confirmed the signature and that
 * the event is not a replay.
 */
export async function applyWebhookEvent(
  eventType: string,
  payload: unknown
): Promise<Result<null>> {
  const entity = extractPaymentEntity(payload);

  switch (eventType) {
    case "payment.captured":
    case "order.paid": {
      if (!entity?.order_id || !entity.id) return err("validation", "Webhook had no order id.");
      return applyCapturedPayment({
        orderId: entity.order_id,
        paymentId: entity.id,
        ...(entity.method ? { method: entity.method } : {}),
        ...(typeof entity.fee === "number" ? { feePaise: entity.fee } : {}),
        ...(typeof entity.tax === "number" ? { taxPaise: entity.tax } : {}),
      });
    }
    case "payment.failed": {
      if (!entity?.order_id) return err("validation", "Webhook had no order id.");
      return applyFailedPayment({
        orderId: entity.order_id,
        ...(entity.id ? { paymentId: entity.id } : {}),
        ...(entity.error_code ? { errorCode: entity.error_code } : {}),
        ...(entity.error_description ? { errorDescription: entity.error_description } : {}),
      });
    }
    case "refund.processed":
    case "refund.created": {
      return recordRefundFromWebhook(payload);
    }
    default:
      // Unhandled event types are recorded but not acted on. Returning ok keeps
      // Razorpay from retrying something we have deliberately ignored.
      return ok(null);
  }
}

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  method?: string;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
}

function extractPaymentEntity(payload: unknown): RazorpayPaymentEntity | null {
  if (typeof payload !== "object" || payload === null) return null;
  const root = payload as { payload?: { payment?: { entity?: unknown }; order?: { entity?: unknown } } };
  const entity = root.payload?.payment?.entity ?? root.payload?.order?.entity;
  if (typeof entity !== "object" || entity === null) return null;
  return entity as RazorpayPaymentEntity;
}

async function recordRefundFromWebhook(payload: unknown): Promise<Result<null>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  if (typeof payload !== "object" || payload === null) {
    return err("validation", "Malformed refund webhook.");
  }
  const root = payload as { payload?: { refund?: { entity?: Record<string, unknown> } } };
  const refund = root.payload?.refund?.entity;
  if (!refund) return err("validation", "Refund webhook had no refund entity.");

  const paymentId = typeof refund.payment_id === "string" ? refund.payment_id : null;
  const refundId = typeof refund.id === "string" ? refund.id : null;
  const amount = typeof refund.amount === "number" ? refund.amount : null;
  if (!paymentId || !refundId || amount === null) {
    return err("validation", "Refund webhook was incomplete.");
  }

  const { data: payment, error: lookupError } = await admin
    .from("payments").select("id").eq("razorpay_payment_id", paymentId).maybeSingle();
  if (lookupError) return fromPostgrestError(lookupError);
  if (!payment) return err("not_found", "Refund refers to a payment we have no record of.");

  const { error } = await admin.from("refunds").upsert(
    {
      payment_id: payment.id,
      razorpay_refund_id: refundId,
      amount_paise: amount,
      status: "processed",
      processed_at: new Date().toISOString(),
    },
    { onConflict: "razorpay_refund_id" }
  );

  // The refunds trigger rolls the total up into payments, which rolls up into
  // the booking's payment_status. Nothing to do here beyond the insert.
  if (error) return fromPostgrestError(error);
  return ok(null);
}

// --------------------------------------------------------- admin reporting ---

import { createClient } from "@/lib/supabase/server";
import { range, safeSort, sanitiseSearch, type ListParams, type Paginated } from "@/lib/services/types";

export const PAYMENT_SORT_COLUMNS = ["created_at", "captured_at", "amount_paise", "status"] as const;
export type PaymentSortColumn = (typeof PAYMENT_SORT_COLUMNS)[number];

export interface PaymentFilters extends ListParams {
  status?: PaymentRow["status"] | "all";
  from?: string;
  to?: string;
}

export interface PaymentListRow {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountPaise: number;
  amountRefundedPaise: number;
  currency: string;
  status: PaymentRow["status"];
  method: string | null;
  verifiedVia: string | null;
  capturedAt: string | null;
  createdAt: string;
  bookingReference: string | null;
  bookingId: string | null;
  customerLabel: string;
  healerName: string | null;
}

/**
 * The payments ledger.
 *
 * Reads our own records rather than calling Razorpay's API, which means the
 * admin figures do not depend on a third party being reachable and cannot
 * silently disagree with the bookings they belong to. A reconciliation layer
 * against the live API can be added later; this is the source of truth for
 * what we believe happened.
 *
 * RLS restricts payments to admins, so an editor calling this gets no rows.
 */
export async function listPayments(
  filters: PaymentFilters = {}
): Promise<Result<Paginated<PaymentListRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);
  const sort = safeSort<PaymentSortColumn>(filters.sort, PAYMENT_SORT_COLUMNS, "created_at");

  let query = supabase
    .from("payments")
    .select(
      "id, razorpay_order_id, razorpay_payment_id, amount_paise, amount_refunded_paise, currency, status, method, verified_via, captured_at, created_at, bookings(reference, id, guest_name, guest_email, healers(name))",
      { count: "exact" }
    )
    .order(sort, { ascending: (filters.direction ?? "desc") === "asc" })
    .range(from, to);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const term = sanitiseSearch(filters.search);
  if (term) {
    query = query.or(`razorpay_order_id.ilike.%${term}%,razorpay_payment_id.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load payments.");

  type Joined = {
    id: string; razorpay_order_id: string; razorpay_payment_id: string | null;
    amount_paise: number; amount_refunded_paise: number; currency: string;
    status: PaymentRow["status"]; method: string | null; verified_via: string | null;
    captured_at: string | null; created_at: string;
    bookings: {
      reference: string; id: string; guest_name: string | null; guest_email: string | null;
      healers: { name: string } | { name: string }[] | null;
    } | null;
  };

  const rows = (data ?? []) as unknown as Joined[];

  return ok({
    rows: rows.map((row) => {
      const booking = row.bookings;
      const healer = Array.isArray(booking?.healers) ? booking?.healers[0] : booking?.healers;
      return {
        id: row.id,
        razorpayOrderId: row.razorpay_order_id,
        razorpayPaymentId: row.razorpay_payment_id,
        amountPaise: row.amount_paise,
        amountRefundedPaise: row.amount_refunded_paise,
        currency: row.currency,
        status: row.status,
        method: row.method,
        verifiedVia: row.verified_via,
        capturedAt: row.captured_at,
        createdAt: row.created_at,
        bookingReference: booking?.reference ?? null,
        bookingId: booking?.id ?? null,
        // Guest name where given, otherwise a neutral label. The email is not
        // put in a list view that gets exported and shared.
        customerLabel: booking?.guest_name ?? (booking ? "HealerJi member" : "—"),
        healerName: healer?.name ?? null,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  });
}

export interface PaymentSummary {
  grossPaise: number;
  netPaise: number;
  refundedPaise: number;
  captured: number;
  failed: number;
  pending: number;
  refunds: number;
  averagePaise: number | null;
}

/**
 * Totals for the payments screen.
 *
 * Computed with count-only queries and a single amounts fetch rather than
 * pulling every row, and `averagePaise` is null when nothing was captured —
 * an average of zero payments is not zero, it is undefined.
 */
export async function getPaymentSummary(filters: {
  from?: string;
  to?: string;
} = {}): Promise<Result<PaymentSummary>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const scope = <T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(q: T): T => {
    let out = q;
    if (filters.from) out = out.gte("created_at", filters.from);
    if (filters.to) out = out.lte("created_at", filters.to);
    return out;
  };

  const [captured, failed, pending, refunds] = await Promise.all([
    scope(supabase.from("payments").select("amount_paise, amount_refunded_paise").eq("status", "captured")),
    scope(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed")),
    scope(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "created")),
    supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "processed"),
  ]);

  if (captured.error) return fromPostgrestError(captured.error, "We couldn't load payment totals.");

  const rows = captured.data ?? [];
  const grossPaise = rows.reduce((sum, r) => sum + r.amount_paise, 0);
  const refundedPaise = rows.reduce((sum, r) => sum + r.amount_refunded_paise, 0);

  return ok({
    grossPaise,
    netPaise: grossPaise - refundedPaise,
    refundedPaise,
    captured: rows.length,
    failed: failed.count ?? 0,
    pending: pending.count ?? 0,
    refunds: refunds.count ?? 0,
    averagePaise: rows.length > 0 ? Math.round(grossPaise / rows.length) : null,
  });
}
