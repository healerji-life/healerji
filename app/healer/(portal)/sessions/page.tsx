import Link from "next/link";
import { requireHealer } from "@/lib/auth/session";
import { listHealerSessions } from "@/lib/services/bookings";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookingRow } from "@/lib/supabase/types";

export const metadata = { title: "Sessions · HealerJi" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const KIND_LABEL: Record<string, string> = {
  chat: "Chat",
  audio: "Audio call",
  video: "Video call",
};

/**
 * The healer's sessions.
 *
 * listHealerSessions filters by healer_id, but that is not what makes this safe:
 * RLS on bookings only returns rows where healer_id = current_healer_id(), so a
 * healer cannot see another healer's sessions even by manipulating the request.
 *
 * Note what is deliberately absent: no amount, no payment identifiers, no
 * customer email or phone. A healer needs to know who is coming and when — the
 * money is between the customer and HealerJi.
 */
export default async function HealerSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await requireHealer();
  const params = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === params.tab)?.key ?? "today") as TabKey;

  const window = tab === "cancelled" ? "past" : tab === "past" ? "past" : tab;
  const result = await listHealerSessions(viewer.healerId, window);

  let rows: BookingRow[] = result.ok ? result.data : [];
  if (tab === "cancelled") {
    rows = rows.filter((b) => b.status === "cancelled" || b.status === "no_show");
  } else if (tab === "past") {
    rows = rows.filter((b) => b.status === "completed" || b.status === "confirmed");
  }

  return (
    <>
      <header className="pb-5">
        <h1 className="font-display text-[1.75rem] leading-tight">Sessions</h1>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-mist-400">
          Everyone you&rsquo;re holding time for.
        </p>
      </header>

      <nav aria-label="Session filter" className="flex gap-1.5 overflow-x-auto pb-5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/healer/sessions?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
              tab === t.key
                ? "bg-plum-900 font-medium text-surface-0"
                : "hairline text-ink-600 hover:bg-ink-900/[0.035] dark:text-mist-400 dark:hover:bg-surface-0/[0.06]"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!result.ok ? (
        <p role="alert" className="rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
          We couldn&rsquo;t load your sessions. Please try again in a moment.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-e-1 dark:bg-night-900">
          <p className="font-display text-lg">
            {tab === "today"
              ? "Nothing today."
              : tab === "upcoming"
                ? "Nothing booked yet."
                : tab === "cancelled"
                  ? "No cancellations."
                  : "No completed sessions yet."}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600 dark:text-mist-400">
            {tab === "upcoming"
              ? "Once your availability is open, confirmed bookings appear here."
              : "Sessions appear here as customers book and complete them."}
          </p>
          {tab === "upcoming" ? (
            <Link
              href="/healer/availability"
              className="mt-5 inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0"
            >
              Check your availability
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((booking) => (
            <li key={booking.id} className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg tabular-nums">
                    {new Date(booking.starts_at).toLocaleTimeString("en-IN", {
                      hour: "numeric", minute: "2-digit",
                    })}
                    <span className="ml-2 text-sm font-normal text-mist-500">
                      {booking.duration_minutes} min
                    </span>
                  </p>
                  <p className="mt-1 text-sm">
                    {booking.guest_name ?? "HealerJi member"}
                  </p>
                  <p className="mt-0.5 text-xs text-mist-500">
                    {KIND_LABEL[booking.session_kind] ?? booking.session_kind}
                    {" · "}
                    {formatDate(booking.starts_at)}
                    {" · "}
                    <span className="font-mono">{booking.reference}</span>
                  </p>
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    booking.status === "confirmed"
                      ? "bg-success-100 text-success-700"
                      : booking.status === "completed"
                        ? "bg-mist-100 text-mist-700 dark:bg-night-800 dark:text-mist-300"
                        : "bg-error-50 text-error-700"
                  )}
                >
                  {booking.status.replace("_", " ")}
                </span>
              </div>

              {booking.customer_note ? (
                <div className="mt-4 rounded-sm bg-surface-50 p-3.5 dark:bg-night-950">
                  <p className="text-xs font-medium text-mist-500">
                    What they&rsquo;d like you to know
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{booking.customer_note}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
