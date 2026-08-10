/**
 * Every service returns a Result rather than throwing.
 *
 * Requirement 51: no screen should ever show "Saved!" because a promise did
 * not reject. A caller has to look at `ok` to know what happened, which makes
 * forgetting the failure path a type error rather than a silent lie.
 */
export type Result<T> =
  | { ok: true; data: T }
  | Failure;

/**
 * The failure arm on its own. The helpers below can only ever produce this, so
 * they say so: a caller reading `.error` off one of them should not have to
 * re-narrow a union that has no reachable success branch. Failure remains
 * assignable to Result<T> for every T, so returning one from a service is
 * unchanged.
 */
export type Failure = { ok: false; error: ServiceError };

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  /** Safe to render to a user. Never contains database or provider internals. */
  detail?: string;
}

export type ServiceErrorCode =
  | "not_configured"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "slot_taken"
  | "validation"
  | "rate_limited"
  | "upstream"
  | "unknown";

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = (code: ServiceErrorCode, message: string, detail?: string): Failure => ({
  ok: false,
  error: detail === undefined ? { code, message } : { code, message, detail },
});

export const NOT_CONFIGURED = (what: string): Failure =>
  err("not_configured", `${what} is not configured on this deployment yet.`);

/**
 * Maps a Postgres error onto a Result without leaking schema details.
 * The codes that matter here are the ones our own constraints raise.
 */
export function fromPostgrestError(
  error: { code?: string | null; message?: string | null } | null,
  fallback = "Something went wrong. Please try again."
): Failure {
  const code = error?.code ?? "";
  const message = error?.message ?? "";

  if (code === "23P01" || message.includes("slot_taken") || message.includes("bookings_no_overlap")) {
    return err("slot_taken", "That time was just taken. Please choose another slot.");
  }
  if (message.includes("slot_unavailable")) {
    return err("conflict", "That time is no longer available. Please choose another slot.");
  }
  if (code === "42501" || message.includes("insufficient_privilege")) {
    return err("forbidden", "You do not have permission to do that.");
  }
  if (code === "23505") {
    return err("conflict", "That already exists.");
  }
  if (code === "23503") {
    return err("validation", "That refers to something which no longer exists.");
  }
  if (code === "PGRST116" || message.includes("healer_not_found")) {
    return err("not_found", "We couldn't find that.");
  }
  if (code === "23514" || code === "22023") {
    return err("validation", "Please check the details and try again.");
  }
  return err("unknown", fallback);
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

/**
 * Sort columns arrive from the query string, so they are attacker-controlled.
 * Passing one straight to .order() would let anyone probe which columns exist
 * by watching which sorts error. Each service declares its own allowlist and
 * falls back to a safe default.
 */
export function safeSort<T extends string>(
  requested: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return (allowed as readonly string[]).includes(requested ?? "") ? (requested as T) : fallback;
}

/** Escapes PostgREST's or() separators so a search term cannot alter the filter. */
export function sanitiseSearch(term: string | undefined): string {
  return (term ?? "").replace(/[,()*:"']/g, " ").trim().slice(0, 120);
}

export const DEFAULT_PAGE_SIZE = 25;

export function range(params: ListParams): { from: number; to: number; page: number; pageSize: number } {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1, page, pageSize };
}
