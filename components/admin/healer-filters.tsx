"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Filters, held in the URL.
 *
 * Filtering is a server round-trip on purpose: the result set is paginated and
 * permission-filtered by RLS, so filtering client-side would either be wrong or
 * require shipping rows the viewer may not see.
 */
export function HealerFilterBar({
  modalities,
  current,
}: {
  modalities: { slug: string; name: string }[];
  current: { q: string; status: string; featured: boolean; modality: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page"); // a new filter always returns to page one
    startTransition(() => router.push(`/admin/healers?${next.toString()}`));
  }

  return (
    <div className="rounded-lg bg-white p-3 shadow-e-1 dark:bg-night-900" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="min-w-[220px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            apply({ q: value ? String(value) : null });
          }}
        >
          <label className="sr-only" htmlFor="healer-search">Search healers</label>
          <input
            id="healer-search"
            name="q"
            type="search"
            defaultValue={current.q}
            placeholder="Search name, headline or slug…"
            className="h-10 w-full rounded-full bg-surface-50 px-4 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />
        </form>

        <select
          aria-label="Status"
          value={current.status}
          onChange={(e) => apply({ status: e.target.value || null })}
          className="h-10 rounded-full bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>

        <select
          aria-label="Modality"
          value={current.modality}
          onChange={(e) => apply({ modality: e.target.value || null })}
          className="h-10 max-w-[200px] rounded-full bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
        >
          <option value="">All modalities</option>
          {modalities.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </select>

        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-surface-50 px-4 text-sm dark:bg-night-950">
          <input
            type="checkbox"
            checked={current.featured}
            onChange={(e) => apply({ featured: e.target.checked ? "1" : null })}
            className="h-3.5 w-3.5 accent-[#BE3A95]"
          />
          Featured only
        </label>

        {current.q || current.status || current.modality || current.featured ? (
          <button
            type="button"
            onClick={() => apply({ q: null, status: null, modality: null, featured: null })}
            className="h-10 rounded-full px-4 text-sm underline underline-offset-4"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
