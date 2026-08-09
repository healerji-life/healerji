import { requireHealer } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { HealerPortalNav } from "@/components/healer/portal-nav";

/**
 * The healer portal shell.
 *
 * A route group, so /healer/login sits outside it and is reachable while signed
 * out. requireHealer() runs on every request here: it verifies the session, the
 * healer role, AND that the account is linked to a healer record. Middleware
 * redirects the obvious cases first, but this is the check that matters, with
 * RLS beneath it.
 *
 * Mobile-first: bottom padding leaves room for the fixed nav bar on phones.
 */
export const dynamic = "force-dynamic";

export default async function HealerPortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireHealer();

  return (
    <div className="min-h-svh bg-surface-0 pb-20 text-ink-900 sm:pb-0 dark:bg-night-950 dark:text-surface-0">
      <header className="border-b border-mist-200/70 px-5 pb-0 pt-6 sm:px-8 dark:border-night-800">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
            <div>
              <p className="font-display text-[0.6875rem] uppercase tracking-[0.18em] text-orchid-500">
                HealerJi
              </p>
              <p className="mt-1 font-display text-lg">
                {viewer.fullName ?? viewer.email}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="h-10 rounded-full px-4 text-sm hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
              >
                Sign out
              </button>
            </form>
          </div>
          <HealerPortalNav />
        </div>
      </header>

      <main className="px-5 py-7 sm:px-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
