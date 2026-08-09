/**
 * Practice history, favourites and resume points.
 *
 * Kept on the device so the player is genuinely functional today;
 * shaped as the rows a `practice_sessions` table would hold, so
 * signing in later simply syncs rather than migrates.
 */
export interface PracticeProgress {
  slug: string;
  /** index of the step to resume from; 0 when unstarted */
  step: number;
  completedAt?: string;
  lastOpenedAt: string;
  timesCompleted: number;
}

const PROGRESS_KEY = "healerji.practice.progress";
const FAVOURITE_KEY = "healerji.practice.favourites";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing — the session still works, it just won't be remembered */
  }
}

export const loadProgress = (): Record<string, PracticeProgress> =>
  read<Record<string, PracticeProgress>>(PROGRESS_KEY, {});

export function saveProgress(slug: string, patch: Partial<PracticeProgress>) {
  const all = loadProgress();
  const prev = all[slug] ?? { slug, step: 0, lastOpenedAt: new Date().toISOString(), timesCompleted: 0 };
  all[slug] = { ...prev, ...patch, slug, lastOpenedAt: new Date().toISOString() };
  write(PROGRESS_KEY, all);
}

export function markComplete(slug: string) {
  const all = loadProgress();
  const prev = all[slug] ?? { slug, step: 0, lastOpenedAt: new Date().toISOString(), timesCompleted: 0 };
  all[slug] = {
    ...prev,
    slug,
    step: 0,
    completedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    timesCompleted: prev.timesCompleted + 1,
  };
  write(PROGRESS_KEY, all);
}

export const loadFavourites = (): string[] => read<string[]>(FAVOURITE_KEY, []);

export function toggleFavourite(slug: string): string[] {
  const list = loadFavourites();
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  write(FAVOURITE_KEY, next);
  return next;
}
