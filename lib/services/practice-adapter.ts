import type { Practice, PracticeStep } from "@/lib/content/practice";
import { isPracticeCategory, practiceMinutesFromSteps } from "@/lib/content/practice";
import type { PracticeRow } from "@/lib/supabase/types";

/**
 * Database row -> the `Practice` shape the existing public components render.
 *
 * Same approach as the healer and article adapters: cut the data source over
 * without touching the design system. PracticePlayer and the practice pages keep
 * working exactly as written.
 *
 * `steps` is jsonb, so it is validated rather than trusted: a malformed row
 * yields an empty step list, which the player handles, instead of throwing
 * mid-session on someone doing a breathing exercise.
 */
export function toPractice(row: PracticeRow): Practice {
  const steps = parseSteps(row.steps);

  return {
    slug: row.slug,
    title: row.title,
    category: isPracticeCategory(row.category) ? row.category : "Breath",
    standfirst: row.summary,
    // Prefer the stored figure, but fall back to deriving it from the steps so a
    // card never advertises nine minutes for a three-minute practice.
    minutes: row.minutes > 0 ? row.minutes : practiceMinutesFromSteps(steps),
    ...(row.audio_url ? { audio: row.audio_url } : {}),
    steps,
    after: row.after_note,
  };
}

export function toPractices(rows: PracticeRow[]): Practice[] {
  return rows.map(toPractice);
}

function parseSteps(value: unknown): PracticeStep[] {
  if (!Array.isArray(value)) return [];
  const steps: PracticeStep[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const say = typeof record.say === "string" ? record.say : null;
    const seconds = Number(record.seconds);
    if (!say || !Number.isFinite(seconds) || seconds <= 0) continue;
    steps.push({ say, seconds: Math.min(3600, Math.round(seconds)) });
  }
  return steps;
}
