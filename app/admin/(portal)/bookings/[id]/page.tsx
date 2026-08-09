import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getBookingDetail } from "@/lib/services/bookings";
import { PageHeader, Panel, Badge, Table, Th, Td } from "@/components/admin/ui";
import { BookingStatusForm } from "@/components/admin/booking-status-form";
import { formatPaise, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requirePermission("bookings.view.all");
  const { id } = await params;

  const result = await getBookingDetail(id);
  if (!result.ok) {
    if (result.error.code === "not_found") notFound();
    throw new Error(result.error.message);
  }

  const { booking, healerName, customerEmail, payments, events } = result.data;
  const captured = payments.find((p) => p.status === "captured");

  return (
    <>
      <PageHeader
        eyebrow="Bookings"
        title={booking.reference}
        description={`${healerName} · ${formatDate(booking.starts_at, true)}`}
        actions={
          <Link
            href="/admin/bookings"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
          >
            All bookings
          </Link>
        }
      />

      {/* A confirmed booking with no captured payment is a genuine anomaly and
          must be visible rather than buried in a status pill. */}
      {booking.status === "confirmed" && !captured ? (
        <p
          role="alert"
          className="mb-4 rounded-sm border-l-2 border-warning-700 bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          This booking is confirmed but carries no captured payment. That should
          not happen — check the webhook log before treating the session as paid.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel title="Session">
            <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
              <Row label="Status">
                <Badge
                  tone={
                    booking.status === "confirmed" || booking.status === "completed"
                      ? "positive"
                      : booking.status === "pending_payment"
                        ? "warning"
                        : "critical"
                  }
                >
                  {booking.status.replace("_", " ")}
                </Badge>
              </Row>
              <Row label="Payment">
                <Badge tone={booking.payment_status === "paid" ? "positive" : "neutral"}>
                  {booking.payment_status.replace("_", " ")}
                </Badge>
              </Row>
              <Row label="Healer">{healerName}</Row>
              <Row label="Session type">
                <span className="capitalize">{booking.session_kind}</span> · {booking.duration_minutes} min
              </Row>
              <Row label="Starts">{formatDate(booking.starts_at, true)}</Row>
              <Row label="Ends">{formatDate(booking.ends_at, true)}</Row>
              <Row label="Amount">{formatPaise(booking.amount_paise)}</Row>
              <Row label="Created">{formatDate(booking.created_at, true)}</Row>
              {booking.source_route ? <Row label="Booked from">{booking.source_route}</Row> : null}
              {booking.cancelled_at ? (
                <Row label="Cancelled">{formatDate(booking.cancelled_at, true)}</Row>
              ) : null}
            </dl>
            {booking.cancellation_reason ? (
              <div className="border-t border-mist-200/70 px-6 py-4 text-sm dark:border-night-800">
                <p className="text-mist-500">Reason</p>
                <p className="mt-1">{booking.cancellation_reason}</p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Customer">
            <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
              <Row label="Name">{booking.guest_name ?? "HealerJi member"}</Row>
              <Row label="Email">{customerEmail ?? "Not recorded"}</Row>
              <Row label="Phone">{booking.guest_phone ?? "Not recorded"}</Row>
              <Row label="Account">
                {booking.customer_id ? (
                  <Link
                    href={`/admin/customers/${booking.customer_id}`}
                    className="underline underline-offset-4"
                  >
                    View customer
                  </Link>
                ) : (
                  <span className="text-mist-500">Guest checkout</span>
                )}
              </Row>
            </dl>
            {booking.customer_note ? (
              <div className="border-t border-mist-200/70 px-6 py-4 dark:border-night-800">
                <p className="text-sm text-mist-500">
                  Note for the healer — shared only with them
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">{booking.customer_note}</p>
              </div>
            ) : null}
          </Panel>

          {can(viewer.roles, "payments.view") ? (
            <Panel
              title="Payments"
              description="Our own verified records, not a live Razorpay call."
            >
              {payments.length === 0 ? (
                <p className="px-6 py-8 text-sm text-mist-500">
                  No payment has been attempted for this booking yet.
                </p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Order ID</Th>
                      <Th>Payment ID</Th>
                      <Th>Status</Th>
                      <Th>Verified by</Th>
                      <Th align="right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <Td className="font-mono text-xs">{p.razorpay_order_id}</Td>
                        <Td className="font-mono text-xs">{p.razorpay_payment_id ?? "—"}</Td>
                        <Td>
                          <Badge tone={p.status === "captured" ? "positive" : p.status === "failed" ? "critical" : "neutral"}>
                            {p.status}
                          </Badge>
                        </Td>
                        <Td className="text-xs text-mist-500">{p.verified_via ?? "—"}</Td>
                        <Td align="right">
                          {formatPaise(p.amount_paise)}
                          {p.amount_refunded_paise > 0 ? (
                            <span className="block text-xs text-mist-500">
                              {formatPaise(p.amount_refunded_paise)} refunded
                            </span>
                          ) : null}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-4">
          {can(viewer.roles, "bookings.manage") ? (
            <Panel title="Change status">
              <div className="px-6 py-5">
                <BookingStatusForm bookingId={booking.id} current={booking.status} />
              </div>
            </Panel>
          ) : null}

          <Panel title="History" description="Every status change, appended automatically.">
            {events.length === 0 ? (
              <p className="px-6 py-6 text-sm text-mist-500">No transitions recorded.</p>
            ) : (
              <ol className="divide-y divide-mist-200/50 dark:divide-night-800/70">
                {events.map((e, i) => (
                  <li key={i} className="px-6 py-3.5 text-sm">
                    <p>
                      {e.from_status ? (
                        <>
                          <span className="text-mist-500">{e.from_status.replace("_", " ")}</span>
                          <span aria-hidden className="mx-2 text-mist-500">to</span>
                        </>
                      ) : (
                        <span className="text-mist-500">created as </span>
                      )}
                      <span className="font-medium">{e.to_status.replace("_", " ")}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-mist-500">{formatDate(e.created_at, true)}</p>
                    {e.note ? <p className="mt-1 text-xs">{e.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
