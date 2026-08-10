import Link from "next/link";
import { requireHealer } from "@/lib/auth/session";
import { getBookingSettings } from "@/lib/services/availability";
import { createClient } from "@/lib/supabase/server";
import { HealerAccountForm } from "@/components/healer/account-form";
import { PasswordResetForm } from "@/components/healer/password-reset-form";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Settings · HealerJi" };
export const dynamic = "force-dynamic";

/**
 * Healer settings.
 *
 * No password field anywhere: changing one goes through Supabase's emailed link,
 * so this application never receives or stores a credential. Nothing here
 * exposes a key, a token or a provider secret.
 */
export default async function HealerSettingsPage() {
  const viewer = await requireHealer();

  const supabase = await createClient();
  const [settings, profile] = await Promise.all([
    getBookingSettings(viewer.healerId),
    supabase
      ? supabase
          .from("profiles")
          .select("full_name, phone, marketing_opt_in, auth_provider, created_at, last_sign_in_at")
          .eq("id", viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);


  const p = profile.data;

  return (
    <>
      <header className="pb-6">
        <h1 className="font-display text-[1.75rem] leading-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-mist-400">
          Your account and how you&rsquo;re reachable.
        </p>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Account</h2>
        <div className="mt-4">
          <HealerAccountForm
            initial={{
              fullName: p?.full_name ?? viewer.fullName ?? "",
              phone: p?.phone ?? "",
              marketingOptIn: p?.marketing_opt_in ?? false,
            }}
          />
        </div>
        <dl className="mt-6 grid gap-4 border-t border-mist-200/70 pt-5 sm:grid-cols-2 dark:border-night-800">
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Email</dt>
            <dd className="mt-1 break-all text-sm">{viewer.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Sign-in method</dt>
            <dd className="mt-1 text-sm capitalize">{p?.auth_provider ?? "email"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Joined</dt>
            <dd className="mt-1 text-sm">{formatDate(p?.created_at ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Last sign-in</dt>
            <dd className="mt-1 text-sm">
              {p?.last_sign_in_at ? formatDate(p.last_sign_in_at, true) : "This session"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-mist-500">
          Your email address is how customers&rsquo; bookings reach you, so it&rsquo;s
          changed by HealerJi rather than here — ask us and we&rsquo;ll do it.
        </p>
      </section>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Availability preferences</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          Buffers, notice periods and how far ahead people can book live with your
          schedule, so they stay together.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Summary label="Accepting bookings" value={settings.ok && settings.data?.accepting_bookings ? "Yes" : "No"} />
          <Summary label="Buffer after a session" value={settings.ok && settings.data ? `${settings.data.buffer_minutes} min` : "—"} />
          <Summary label="Minimum notice" value={settings.ok && settings.data ? `${settings.data.min_notice_minutes} min` : "—"} />
          <Summary label="Booking window" value={settings.ok && settings.data ? `${settings.data.max_advance_days} days` : "—"} />
          <Summary label="Timezone" value={settings.ok && settings.data ? settings.data.timezone : "—"} />
        </dl>
        <Link
          href="/healer/availability"
          className="mt-5 inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
        >
          Edit in Availability
        </Link>
      </section>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Security</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          HealerJi never stores your password and no administrator can see it.
        </p>
        <div className="mt-4">
          <PasswordResetForm />
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Notifications</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          Booking confirmations and reminders are sent to {viewer.email}.
        </p>
        <p className="mt-3 rounded-sm bg-surface-50 p-3.5 text-xs text-mist-500 dark:bg-night-950">
          Per-notification controls aren&rsquo;t built yet. Rather than show switches
          that do nothing, we&rsquo;ve left them out — every booking still emails you
          once the email provider is connected.
        </p>
      </section>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-surface-50 p-3 dark:bg-night-950">
      <dt className="text-xs text-mist-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
