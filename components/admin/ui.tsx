import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Admin primitives.
 *
 * Server components by default — none of these need interactivity, so none of
 * them ship JavaScript. Requirements 50 and 51: empty, error and loading are
 * first-class here rather than afterthoughts, because an operations tool is
 * judged on how it behaves when something is wrong.
 */

export function PageHeader({
  eyebrow, title, description, actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-7">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-display text-[0.6875rem] uppercase tracking-[0.18em] text-orchid-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 font-display text-[1.75rem] leading-tight text-ink-900 dark:text-surface-0">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-600 dark:text-mist-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title, description, children, className, footer,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg bg-white shadow-e-1 dark:bg-night-900", className)}>
      {title ? (
        <div className="border-b border-mist-200/70 px-6 py-4 dark:border-night-800">
          <h2 className="font-display text-[1.0625rem]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-ink-600 dark:text-mist-400">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
      {footer ? (
        <div className="border-t border-mist-200/70 px-6 py-3 dark:border-night-800">{footer}</div>
      ) : null}
    </section>
  );
}

/**
 * A statistic. `value === null` means "we have no data", which is rendered
 * differently from a real zero — those mean different things operationally.
 */
export function StatCard({
  label, value, hint, delta,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  delta?: { pct: number; label: string } | null;
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
      <p className="text-[0.8125rem] text-ink-600 dark:text-mist-400">{label}</p>
      {value === null ? (
        <p className="mt-2.5 text-sm text-mist-500">No data yet</p>
      ) : (
        <p className="mt-1.5 font-display text-[1.875rem] leading-none tabular-nums text-ink-900 dark:text-surface-0">
          {value}
        </p>
      )}
      {delta ? (
        <p
          className={cn(
            "mt-2 text-xs tabular-nums",
            delta.pct > 0 ? "text-success-700" : delta.pct < 0 ? "text-error-700" : "text-mist-500"
          )}
        >
          {delta.pct > 0 ? "▲" : delta.pct < 0 ? "▼" : "–"} {Math.abs(delta.pct).toFixed(1)}%{" "}
          <span className="text-mist-500">{delta.label}</span>
        </p>
      ) : null}
      {hint && !delta ? <p className="mt-2 text-xs text-mist-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title, description, action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-display text-lg text-ink-900 dark:text-surface-0">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-600 dark:text-mist-400">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Rendered when a service returns { ok: false }. The message shown is the
 * service's user-safe message — never a Postgres string.
 */
export function ErrorState({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="rounded-lg border-l-2 border-error-700 bg-white p-6 shadow-e-1 dark:bg-night-900">
      <p className="font-medium text-ink-900 dark:text-surface-0">{message}</p>
      {detail ? <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">{detail}</p> : null}
    </div>
  );
}

export function Badge({
  tone = "neutral", children,
}: {
  tone?: "neutral" | "positive" | "warning" | "critical" | "brand";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-mist-100 text-mist-700 dark:bg-night-800 dark:text-mist-300",
    positive: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    critical: "bg-error-50 text-error-700",
    brand: "bg-orchid-50 text-plum-900 dark:bg-orchid-500/15 dark:text-orchid-200",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ tables --

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-mist-200/70 px-4 py-3 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-mist-500 dark:border-night-800",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children, align = "left", className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-mist-200/50 px-4 py-3 align-middle dark:border-night-800/70",
        align === "right" && "text-right tabular-nums",
        className
      )}
    >
      {children}
    </td>
  );
}

/** Skeleton rows, used by route-level loading.tsx files. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-4 py-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-mist-200/50 py-4 dark:border-night-800/70">
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              className="h-3.5 flex-1 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800"
              style={{ maxWidth: c === 0 ? "22%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({
  page, pageSize, total, baseHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Already contains the current filters as a query string. */
  baseHref: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const link = (p: number) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}page=${p}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-ink-600 dark:text-mist-400">
        <span className="tabular-nums">{first}–{last}</span> of{" "}
        <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={link(page - 1)} className="flex h-9 items-center rounded-full px-4 hairline">
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={link(page + 1)} className="flex h-9 items-center rounded-full px-4 hairline">
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
