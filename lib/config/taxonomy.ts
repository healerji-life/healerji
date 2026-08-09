import { paths } from "@/lib/data/paths";
import type { PathSlug } from "@/types";

/**
 * The canonical order of the five areas of concern, everywhere:
 *
 *   Health · Relationships · Career · Money · Emotions
 *
 * Nothing else should hard-code this sequence. Filters, menus,
 * metadata, structured data and copy all read from here, so the order
 * cannot drift between surfaces again.
 */
export const CONCERN_ORDER: PathSlug[] = [
  "health-vitality",
  "relationships",
  "career-purpose",
  "money-abundance",
  "emotional-wellbeing",
];

/** The five concerns, always in canonical order. */
export const concerns = CONCERN_ORDER.map(
  (slug) => paths.find((p) => p.slug === slug)!
).filter(Boolean);

/** Short labels, for menus and filters. */
export const concernLabels = concerns.map((c) => c.name);

/** A single sentence listing them — for metadata and prose. */
export const concernSentence = (conjunction = "and") => {
  const names = concerns.map((c) => c.name.toLowerCase());
  return `${names.slice(0, -1).join(", ")} ${conjunction} ${names.at(-1)}`;
};
