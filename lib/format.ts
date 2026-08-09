/**
 * Display formatting.
 *
 * Money is stored and computed in paise (integers) everywhere. It is converted
 * to rupees exactly once, here, at the point of display — never in arithmetic.
 */

export function formatPaise(paise: number, options?: { compact?: boolean }): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: options?.compact && Math.abs(rupees) >= 1000 ? 1 : 0,
    notation: options?.compact && Math.abs(rupees) >= 100000 ? "compact" : "standard",
  }).format(rupees);
}

export const formatNumber = (n: number): string => new Intl.NumberFormat("en-IN").format(n);

/** 102000 -> "1:42". Engagement time is read as minutes and seconds, not ms. */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return "—";
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDate(value: string | Date | null, withTime = false): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** "meera krishnan" -> "meera-krishnan". Matches the DB slug CHECK constraint. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
