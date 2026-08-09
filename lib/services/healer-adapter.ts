import type { Healer, SessionType } from "@/types";
import type { HealerCardRow } from "@/lib/supabase/types";

/**
 * Database row -> the `Healer` shape the existing public components already
 * render.
 *
 * This adapter exists so the cutover changes data sources without touching the
 * design system. HealerCard, HealerBrowser and the profile page keep working
 * exactly as written; only where the data comes from has changed.
 */
export function toHealer(row: HealerCardRow, nextAvailableAt: string | null = null): Healer {
  const gender = row.gender;
  return {
    slug: row.slug,
    name: row.name,
    headline: row.headline,
    modalities: row.modalities ?? [],
    languages: row.languages ?? [],
    gender:
      gender === "female" || gender === "male" || gender === "other" || gender === "undisclosed"
        ? gender
        : null,
    years: row.years,
    // The card calls .toFixed(1) on rating, so a healer without one yet gets 0
    // and the card's own logic decides whether to show it.
    rating: row.rating ?? 0,
    reviews: row.reviews_count,
    pricePaise: row.price_paise,
    nextAvailableAt,
    verified: {
      identity: Boolean(row.verified?.identity),
      credentials: Boolean(row.verified?.credentials),
      interviewed: Boolean(row.verified?.interviewed),
    },
    bio: row.bio,
    sessionTypes: (row.session_types ?? []) as SessionType[],
  };
}

/**
 * Phrasing for the card. Returns null when there is nothing to say — the
 * caller must not substitute a placeholder time.
 */
export function describeNextAvailable(iso: string | null): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((when.getTime() - startOfToday.getTime()) / 86_400_000);
  const time = when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  if (dayDiff <= 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  if (dayDiff < 7) return `${when.toLocaleDateString("en-IN", { weekday: "short" })}, ${time}`;
  return `${when.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

/** True when the next open slot falls on today's date, in the viewer's zone. */
export function isAvailableToday(iso: string | null): boolean {
  if (!iso) return false;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return false;
  const now = new Date();
  return (
    when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() &&
    when.getDate() === now.getDate()
  );
}
