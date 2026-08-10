import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { BreathingMark } from "@/components/breathing-mark";
import { AuthForm } from "@/components/auth/auth-form";
import { signIn, signUp, requestPasswordReset, signInWithGoogle } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { isConfigured } from "@/lib/services/integrations";

export const metadata = { title: "Sign in · HealerJi" };

/**
 * Customer sign-in.
 *
 * Replaces the previous magic-link form with email and password, plus reset
 * and verification, as required. Google sign-in appears only when the provider
 * is genuinely configured — a button that cannot work is worse than no button.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  // Already signed in? Send them where they were going, or to the portal their
  // roles entitle them to. Redirecting everyone to "/" made the navbar's Sign
  // in button look broken: it bounced you straight back to the page you were
  // already on, with no sign anything had happened.
  const viewer = await getViewer();
  if (viewer) {
    const requested = params.next ?? "";
    if (requested.startsWith("/") && !requested.startsWith("//")) redirect(requested);
    redirect(
      isStaff(viewer.roles)
        ? "/admin/dashboard"
        : viewer.roles.includes("healer")
          ? "/healer/dashboard"
          : "/bookings"
    );
  }

  const mode = params.mode === "join" ? "join" : params.mode === "reset" ? "reset" : "signin";
  const googleReady = isConfigured("google_oauth");

  return (
    <div className="flex min-h-[85svh] items-center pb-40 pt-44">
      <Container className="max-w-md">
        <div className="rounded-lg bg-surface-0 p-10 shadow-e-2 dark:bg-night-900">
          <BreathingMark size={30} />

          {params.reason === "unconfigured" ? (
            <p role="status" className="mt-6 rounded-sm bg-surface-50 p-4 text-sm dark:bg-night-950">
              Sign-in isn&rsquo;t configured on this deployment yet.
            </p>
          ) : null}
          {params.reason === "link_expired" ? (
            <p role="alert" className="mt-6 rounded-sm bg-surface-50 p-4 text-sm dark:bg-night-950">
              That link has expired. Please request a new one.
            </p>
          ) : null}

          {mode === "signin" ? (
            <>
              <h1 className="mt-6 font-display text-3xl">Welcome back.</h1>
              <p className="mt-3 text-ink-600 dark:text-mist-400">
                Sign in to see your sessions and bookings.
              </p>
              <div className="mt-6">
                <AuthForm
                  action={signIn}
                  submitLabel="Sign in"
                  pendingLabel="Signing you in…"
                  {...(params.next ? { next: params.next } : {})}
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Link className="underline underline-offset-4" href="/signin?mode=join">
                  Create an account
                </Link>
                <Link className="underline underline-offset-4" href="/signin?mode=reset">
                  Forgotten your password?
                </Link>
              </div>
              {googleReady ? (
                <GoogleButton next={params.next ?? "/"} />
              ) : null}
            </>
          ) : null}

          {mode === "join" ? (
            <>
              <h1 className="mt-6 font-display text-3xl">Join HealerJi.</h1>
              <p className="mt-3 text-ink-600 dark:text-mist-400">
                Free to join. You pay only for the sessions you book.
              </p>
              <div className="mt-6">
                <AuthForm
                  action={signUp}
                  submitLabel="Create account"
                  pendingLabel="Creating your account…"
                  includeName
                  autoComplete="new-password"
                />
              </div>
              <p className="mt-6 text-sm">
                <Link className="underline underline-offset-4" href="/signin">
                  Already have an account?
                </Link>
              </p>
            </>
          ) : null}

          {mode === "reset" ? (
            <>
              <h1 className="mt-6 font-display text-3xl">Reset your password.</h1>
              <p className="mt-3 text-ink-600 dark:text-mist-400">
                We&rsquo;ll email you a link to choose a new one.
              </p>
              <div className="mt-6">
                <AuthForm
                  action={requestPasswordReset}
                  submitLabel="Send reset link"
                  pendingLabel="Sending…"
                  includePassword={false}
                />
              </div>
              <p className="mt-6 text-sm">
                <Link className="underline underline-offset-4" href="/signin">
                  Back to sign in
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </Container>
    </div>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle} className="mt-6">
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="inline-flex h-12 w-full items-center justify-center rounded-full text-[0.9375rem] font-medium hairline hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
      >
        Continue with Google
      </button>
    </form>
  );
}
