import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { listMyBookings } from "@/lib/services/bookings";
import { CancelBookingButton } from "@/components/booking/cancel-button";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Your bookings" };

/**
 * DATABASE-BACKED as of pass 3.
 *
 * This page used to read localStorage, which meant a paid session existed only
 * in the browser that made it — invisible to the healer, invisible to support,
 * and lost when the cache was cleared. It is now a server component reading the
 * database under RLS, so a customer sees their own sessions on any device and
 * cannot see anyone else's.
 *
 * The honest consequence: bookings are now tied to an account. A guest checkout
 * is still recorded server-side and still confirmed, but it cannot be listed
 * here until that person signs in with the same email — which the empty state
 * says plainly rather than implying the booking is missing.
 */
export const dynamic = "force-dynamic";

const KIND_LABEL = { chat: "Chat", audio: "Audio call", video: "Video call" } as const;

export default async function BookingsPage() {
  const result = await listMyBookings();

  return (
    <div className="pb-40 pt-44">
      <Container className="max-w-3xl">
        <header className="max-w-2xl">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            Your sessions
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl">Bookings.</h1>
          <p className="mt-5 text-lg text-ink-600 dark:text-mist-400">
            Every session you&rsquo;ve booked, wherever you signed in from, with
            everything you need to change or cancel it.
          </p>
        </header>

        {!result.ok && result.error.code === "unauthenticated" ? (
          <div className="mt-16 rounded-md border border-ink-900/10 p-10 dark:border-surface-0/10">
            <p className="font-display text-xl">Sign in to see your bookings.</p>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              Your sessions are held against your account rather than this
              browser, so they follow you between your phone and your laptop.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/signin?next=/bookings">Sign in</Link>
            </Button>
          </div>
        ) : null}

        {!result.ok && result.error.code !== "unauthenticated" ? (
          <div className="mt-16 rounded-md border border-error-200 p-10">
            <p className="font-display text-xl">We couldn&rsquo;t load your bookings.</p>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              {result.error.message} Nothing is wrong with your sessions — please
              refresh in a moment.
            </p>
          </div>
        ) : null}

        {result.ok && result.data.length === 0 ? (
          <div className="mt-16 rounded-md border border-ink-900/10 p-10 dark:border-surface-0/10">
            <p className="font-display text-xl">Nothing booked yet.</p>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              When you book a session it appears here, with everything you need to
              change or cancel it. If you booked as a guest, sign in with that
              same email address and it will appear.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/healers">Find a healer</Link>
            </Button>
          </div>
        ) : null}

        {result.ok && result.data.length > 0 ? (
          <ul className="mt-16 space-y-4">
            {result.data.map((booking) => {
              const when = new Date(booking.startsAt);
              const hoursUntil = (when.getTime() - Date.now()) / 3_600_000;
              const isUpcoming =
                hoursUntil > 0 && (booking.status === "confirmed" || booking.status === "pending_payment");

              return (
                <li
                  key={booking.id}
                  className="rounded-md bg-surface-0 p-7 shadow-e-1 dark:bg-night-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-display text-xl">{booking.healerName}</p>
                      <p className="mt-1 text-[0.9375rem] text-ink-600 dark:text-mist-400">
                        {KIND_LABEL[booking.sessionKind]} · {booking.durationMinutes} min
                      </p>
                    </div>
                    <StatusPill status={booking.status} paymentStatus={booking.paymentStatus} />
                  </div>

                  <dl className="mt-5 grid gap-3 text-[0.9375rem] sm:grid-cols-2">
                    <div>
                      <dt className="text-mist-500">When</dt>
                      <dd className="mt-0.5">
                        {when.toLocaleString("en-IN", {
                          weekday: "long", day: "numeric", month: "long",
                          hour: "numeric", minute: "2-digit",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-mist-500">Reference</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">{booking.reference}</dd>
                    </div>
                    <div>
                      <dt className="text-mist-500">Amount</dt>
                      <dd className="mt-0.5">{formatINR(booking.amountPaise)}</dd>
                    </div>
                  </dl>

                  {isUpcoming ? (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <CancelBookingButton
                        bookingId={booking.id}
                        reference={booking.reference}
                        hoursUntil={hoursUntil}
                      />
                      <Button variant="secondary" asChild>
                        <Link href={`/book?healer=${booking.healerSlug}`}>Book another</Link>
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Container>
    </div>
  );
}

function StatusPill({
  status, paymentStatus,
}: {
  status: string;
  paymentStatus: string;
}) {
  // A booking awaiting payment is not "booked". Saying so prevents someone
  // turning up for a session that was never paid for.
  const label =
    status === "confirmed" ? "Confirmed"
      : status === "completed" ? "Completed"
      : status === "cancelled" ? "Cancelled"
      : status === "pending_payment" ? "Awaiting payment"
      : status === "expired" ? "Expired"
      : status === "no_show" ? "Missed"
      : status;

  const tone =
    status === "confirmed" || status === "completed"
      ? "bg-success-100 text-success-700"
      : status === "cancelled" || status === "no_show" || status === "expired"
        ? "bg-mist-100 text-mist-700"
        : "bg-warning-100 text-warning-700";

  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-[0.8125rem] font-medium ${tone}`}>
      {label}
      {paymentStatus === "refunded" ? " · refunded" : ""}
    </span>
  );
}
