import { requireViewer } from "@/lib/auth/session";
import { isAdmin, isStaff } from "@/lib/auth/roles";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

/**
 * Where an invited admin, editor or healer chooses their credential, and where
 * a password reset lands.
 *
 * requireViewer() is the gate: reaching this page at all means the callback
 * already exchanged the emailed code for a real session. Without it the route
 * would be an unauthenticated password-change form.
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await requireViewer("/signin");
  const params = await searchParams;

  // Where to send them once they have a password. An explicit, same-site
  // `next` wins; otherwise their roles decide.
  const requested = params.next ?? "";
  const fallback = isStaff(viewer.roles) || isAdmin(viewer.roles)
    ? "/admin/dashboard"
    : viewer.roles.includes("healer")
      ? "/healer/dashboard"
      : "/";
  const next =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : fallback;

  return (
    <main id="main" className="flex min-h-svh items-center bg-surface-0 px-6 dark:bg-night-950">
      <div className="mx-auto w-full max-w-sm">
        <p className="font-display text-[0.6875rem] uppercase tracking-[0.18em] text-orchid-500">
          HealerJi
        </p>
        <h1 className="mt-3 font-display text-[2rem] leading-tight text-ink-900 dark:text-surface-0">
          Set your password
        </h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-mist-400">
          You&rsquo;re signed in as {viewer.email}. Choose a password so you can sign
          in again next time.
        </p>

        <SetPasswordForm next={next} />
      </div>
    </main>
  );
}
