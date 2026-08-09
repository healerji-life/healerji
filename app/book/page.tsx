import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { BookingFlow } from "@/components/booking-flow";
import { listPublicHealersForSite } from "@/lib/services/healers";

export const metadata: Metadata = {
  title: "Book a session",
  description:
    "Book a chat, audio or video session with a certified HealerJi healer — pick a time, share what you'd like them to know, and pay securely by UPI or card.",
};

/**
 * DATABASE-BACKED as of pass 3.
 *
 * The healer list, their session types and their prices are read from Supabase
 * here, in a server component, and handed to the flow. Availability and the
 * amount charged are resolved server-side later in the flow — this page only
 * needs enough to render the chooser.
 *
 * force-dynamic because prices and the active healer roster must never be
 * served stale on the page where someone is about to pay.
 */
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ healer?: string }>;
}) {
  const { healer } = await searchParams;
  const result = await listPublicHealersForSite();

  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="mb-12 max-w-2xl">
          <h1 className="text-4xl md:text-5xl">Book a session.</h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-mist-400">
            Five small steps, one honest price, and a calm look at everything
            before you pay.
          </p>
        </header>

        {!result.ok ? (
          <div className="rounded-md bg-surface-0 p-8 shadow-e-1 dark:bg-night-900">
            <p className="font-display text-xl">Booking is briefly unavailable.</p>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              We couldn&rsquo;t reach the healer panel. Nothing has been charged and
              no booking was started — please try again in a moment.
            </p>
          </div>
        ) : result.data.length === 0 ? (
          <div className="rounded-md bg-surface-0 p-8 shadow-e-1 dark:bg-night-900">
            <p className="font-display text-xl">No healers are open for booking yet.</p>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              Our healers are setting their calendars. In the meantime you can{" "}
              <Link href="/healers" className="underline underline-offset-4">
                read their profiles
              </Link>
              .
            </p>
          </div>
        ) : (
          <Suspense fallback={null}>
            <BookingFlow healers={result.data} {...(healer ? { initialHealer: healer } : {})} />
          </Suspense>
        )}
      </Container>
    </div>
  );
}
