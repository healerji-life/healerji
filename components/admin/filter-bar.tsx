"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Generic URL-backed filter bar.
 *
 * Filters live in the query string so a view is bookmarkable and shareable,
 * and so the server does the filtering — the result set is paginated and
 * RLS-scoped, which makes client-side filtering either wrong or a data leak.
 */
export interface SelectFilter {
  kind: "select";
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface DateFilter {
  kind: "date";
  name: string;
  label: string;
}

export type FilterSpec = SelectFilter | DateFilter;

export function FilterBar({
  filters, searchPlaceholder,
}: {
  filters: FilterSpec[];
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  const active = filters.some((f) => searchParams.get(f.name)) || searchParams.get("q");

  return (
    <div
      className={cn("rounded-lg bg-white p-3 shadow-e-1 dark:bg-night-900", pending && "opacity-70")}
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center gap-2">
        {searchPlaceholder ? (
          <form
            className="min-w-[200px] flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("q");
              apply({ q: value ? String(value) : null });
            }}
          >
            <label className="sr-only" htmlFor="filter-search">Search</label>
            <input
              id="filter-search"
              name="q"
              type="search"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-full bg-surface-50 px-4 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            />
          </form>
        ) : null}

        {filters.map((filter) =>
          filter.kind === "select" ? (
            <select
              key={filter.name}
              aria-label={filter.label}
              value={searchParams.get(filter.name) ?? ""}
              onChange={(e) => apply({ [filter.name]: e.target.value || null })}
              className="h-10 max-w-[210px] rounded-full bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <label key={filter.name} className="inline-flex items-center gap-2 text-xs text-mist-500">
              {filter.label}
              <input
                type="date"
                value={searchParams.get(filter.name) ?? ""}
                onChange={(e) => apply({ [filter.name]: e.target.value || null })}
                className="h-10 rounded-full bg-surface-50 px-3 text-sm text-ink-900 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950 dark:text-surface-0"
              />
            </label>
          )
        )}

        {active ? (
          <button
            type="button"
            onClick={() =>
              apply(Object.fromEntries([...filters.map((f) => [f.name, null]), ["q", null]]))
            }
            className="h-10 rounded-full px-4 text-sm underline underline-offset-4"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
