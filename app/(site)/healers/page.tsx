import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { HealerBrowser } from "@/components/healer-browser";
import { listPublicHealersForSite } from "@/lib/services/healers";

export const metadata: Metadata = {
  title: "Find a verified healer",
  description:
    "Browse certified healers by what you're feeling, the practice you're drawn to, and the language you think in. Book a 20-minute first session.",
};

/**
 * DATABASE-BACKED as of pass 2.
 *
 * Previously imported `healers` from lib/data/healers.ts. Now reads the
 * healer_cards view, so an edit in the admin portal appears here without a
 * code change or a deployment.
 *
 * revalidate = 300 gives a fast, cached page; the admin's server actions call
 * revalidatePath("/healers") on save, so an edit is visible immediately rather
 * than after the window elapses. The window is only the backstop.
 */
export const revalidate = 300;

export default async function HealersPage() {
  const result = await listPublicHealersForSite();

  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="mb-12 max-w-2xl">
          <h1 className="text-4xl md:text-5xl">Find your healer.</h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-mist-400">
            HealerJi&rsquo;s panel of certified healers is vetted before anyone meets
            their first seeker. Filter by your concern, language, and healer
            preference — healing lands deeper in your mother tongue.
          </p>
        </header>

        {!result.ok ? (
          <p className="rounded-md bg-surface-0 p-8 text-ink-600 shadow-e-1 dark:bg-night-900 dark:text-mist-400">
            We couldn&rsquo;t load the healer panel just now. Please refresh in a
            moment — nothing is wrong with your booking or account.
          </p>
        ) : result.data.length === 0 ? (
          <p className="rounded-md bg-surface-0 p-8 text-ink-600 shadow-e-1 dark:bg-night-900 dark:text-mist-400">
            No healers are listed yet. Please check back shortly.
          </p>
        ) : (
          <Suspense fallback={null}>
            <HealerBrowser healers={result.data} />
          </Suspense>
        )}
      </Container>
    </div>
  );
}
