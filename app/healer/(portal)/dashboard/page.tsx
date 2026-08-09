import Link from "next/link";
import { requireHealer } from "@/lib/auth/session";
import { listHealerSessions } from "@/lib/services/bookings";
import { getBookingSettings, getRules } from "@/lib/services/availability";
import { getHealerById } from "@/lib/services/healers";
import { totalWeeklyHours, WEEKDAYS, normaliseTime } from "@/lib/booking/schedule";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Your day · HealerJi" };
export const dynamic = "force-dynamic";

/**
 * The healer's day.
 *
 * Every figure here counts real rows. Nothing is estimated, and where there is
 * no data the card says so rather than showing a zero that reads like a
 * measurement.
 *
 * Profile completion is computed from actual fields, so the percentage is
 * something the healer can act on rather than a vanity number.
 */
export default async function HealerDashboard() {
  const viewer = await requireHealer();

  const [today, upcoming, rules, settings, healer] = await Promise.all([
    listHealerSessions(viewer.healerId, "today"),
    listHealerSessions(viewer.healerId, "upcoming"),
    getRules(viewer.healerId),
    getBookingSettings(viewer.healerId),
    getHealerById(viewer.healerId),
  ]);

  const todaySessions = today.ok ? today.data : [];
  const upcomingSessions = upcoming.ok ? upcoming.data : [];
  const next = upcomingSessions[0];

  // This week = now until Sunday midnight.
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + ((7 - weekEnd.getDay()) % 7));
  weekEnd.setHours(23, 59, 59, 999);
  const thisWeek = upcomingSessions.filter(
    (b) => new Date(b.starts_at).getTime() <= weekEnd.getTime()
  );

  const schedule = WEEKDAYS.map((day) => ({
    weekday: day.value,
    ranges: (rules.ok ? rules.data : [])
      .filter((r) => r.weekday === day.value)
      .map((r) => ({ start: normaliseTime(r.start_time), end: normaliseTime(r.end_time) })),
  }));
  const weeklyHours = totalWeeklyHours(schedule);
  const accepting = settings.ok ? (settings.data?.accepting_bookings ?? false) : false;

  // Profile completeness from real fields.
  const h = healer.ok ? healer.data : null;
  const checks = [
    { label: "Photograph", done: Boolean(h?.avatar_url) },
    { label: "Biography", done: Boolean(h?.bio && h.bio.length > 80) },
    { label: "Headline", done: Boolean(h?.headline) },
    { label: "Working hours", done: weeklyHours > 0 },
    { label: "Open for bookings", done: accepting },
  ];
  const completed = checks.filter((c) => c.done).length;
  const percent = Math.round((completed / checks.length) * 100);

  return (
    <>
      <header className="pb-6">
        <h1 className="font-display text-[1.75rem] leading-tight">
          {viewer.fullName
            ? `Namaste, ${viewer.fullName.split(" ")[0] ?? viewer.fullName}.`
            : "Your day"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-mist-400">
          {todaySessions.length === 0
            ? "Nothing scheduled today."
            : `${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"} today.`}
        </p>
      </header>

      {!accepting || weeklyHours === 0 ? (
        <div className="mb-6 rounded-lg border-l-2 border-orchid-500 bg-white p-5 shadow-e-1 dark:bg-night-900">
          <p className="font-medium">Your calendar is closed.</p>
          <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
            {weeklyHours === 0
              ? "You haven't set working hours yet, so nobody can book you."
              : "Your hours are set, but you aren't accepting bookings."}
          </p>
          <Link
            href="/healer/availability"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0"
          >
            Open my calendar
          </Link>
        </div>
      ) : null}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today" value={todaySessions.length} />
        <Stat label="This week" value={thisWeek.length} />
        <Stat label="Upcoming" value={upcomingSessions.length} />
        <Stat
          label="Weekly hours"
          value={weeklyHours === 0 ? null : weeklyHours}
          empty="Not set"
        />
      </section>

      {next ? (
        <section aria-labelledby="next-heading" className="mt-6 rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
          <h2 id="next-heading" className="text-xs uppercase tracking-[0.12em] text-mist-500">
            Next session
          </h2>
          <p className="mt-2 font-display text-xl">
            {new Date(next.starts_at).toLocaleString("en-IN", {
              weekday: "long", hour: "numeric", minute: "2-digit",
            })}
          </p>
          <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
            {next.guest_name ?? "HealerJi member"} · {next.session_kind} · {next.duration_minutes} min
          </p>
          {next.customer_note ? (
            <div className="mt-4 rounded-sm bg-surface-50 p-3.5 dark:bg-night-950">
              <p className="text-xs font-medium text-mist-500">They&rsquo;d like you to know</p>
              <p className="mt-1 text-sm leading-relaxed">{next.customer_note}</p>
            </div>
          ) : null}
          <Link
            href="/healer/sessions?tab=upcoming"
            className="mt-4 inline-block text-sm underline underline-offset-4"
          >
            All sessions
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="today-heading" className="mt-6">
        <h2 id="today-heading" className="font-display text-[1.0625rem]">Today</h2>
        {todaySessions.length === 0 ? (
          <p className="mt-3 rounded-lg bg-white p-5 text-sm text-ink-600 shadow-e-1 dark:bg-night-900 dark:text-mist-400">
            No sessions today. Your next is{" "}
            {next ? formatDate(next.starts_at, true) : "not yet booked"}.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todaySessions.map((session) => (
              <li key={session.id} className="rounded-lg bg-white p-4 shadow-e-1 dark:bg-night-900">
                <p className="font-display text-lg tabular-nums">
                  {new Date(session.starts_at).toLocaleTimeString("en-IN", {
                    hour: "numeric", minute: "2-digit",
                  })}
                </p>
                <p className="mt-0.5 text-sm">
                  {session.guest_name ?? "HealerJi member"} · {session.session_kind} ·{" "}
                  {session.duration_minutes} min
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="profile-heading" className="mt-6 rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 id="profile-heading" className="font-display text-[1.0625rem]">
          Profile {percent}% complete
        </h2>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist-200/70 dark:bg-night-800"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-orchid-500 to-plum-900"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ul className="mt-4 space-y-1.5 text-sm">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={
                  check.done
                    ? "flex h-4 w-4 items-center justify-center rounded-full bg-success-100 text-[10px] text-success-700"
                    : "h-4 w-4 rounded-full border border-mist-300"
                }
              >
                {check.done ? "✓" : ""}
              </span>
              <span className={check.done ? "text-mist-500" : ""}>{check.label}</span>
            </li>
          ))}
        </ul>
        {percent < 100 ? (
          <Link href="/healer/profile" className="mt-4 inline-block text-sm underline underline-offset-4">
            Finish your profile
          </Link>
        ) : null}
      </section>
    </>
  );
}

function Stat({
  label, value, empty = "None",
}: {
  label: string;
  value: number | null;
  empty?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-e-1 dark:bg-night-900">
      <p className="text-xs text-mist-500">{label}</p>
      {value === null ? (
        <p className="mt-1.5 text-sm text-mist-500">{empty}</p>
      ) : (
        <p className="mt-1 font-display text-2xl leading-none tabular-nums">{value}</p>
      )}
    </div>
  );
}
