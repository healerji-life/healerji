/**
 * The public `Practice` shape.
 *
 * Moved out of lib/data/practices.ts in pass 6, so database-backed components
 * no longer import their type from a file full of hard-coded content.
 * lib/data/practices.ts re-exports these, so nothing external breaks.
 */

export const PRACTICE_CATEGORIES = ["Breath", "Energy", "Forgiveness", "Grounding", "Sleep"] as const;
export type PracticeCategory = (typeof PRACTICE_CATEGORIES)[number];

export interface PracticeStep {
  /** what the practitioner says at this moment */
  say: string;
  /** seconds this step is held */
  seconds: number;
}

export interface Practice {
  slug: string;
  title: string;
  category: PracticeCategory;
  standfirst: string;
  /** total minutes, for the card */
  minutes: number;
  /** optional recorded guidance, when available */
  audio?: string;
  steps: PracticeStep[];
  /** honest closing note, shown on completion */
  after: string;
}

export function isPracticeCategory(value: unknown): value is PracticeCategory {
  return typeof value === "string" && (PRACTICE_CATEGORIES as readonly string[]).includes(value);
}

/** Derived from the steps, so the card can never disagree with the pacing. */
export function practiceMinutesFromSteps(steps: PracticeStep[]): number {
  return Math.max(1, Math.round(steps.reduce((total, step) => total + step.seconds, 0) / 60));
}
