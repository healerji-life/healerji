"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import type { Article } from "@/lib/content/article";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { ArticleCover } from "@/components/article-cover";


const KINDS = [
  { key: "all", label: "Everything" },
  { key: "guide", label: "Guided practices" },
  { key: "article", label: "Articles" },
] as const;

const BOOKMARK_KEY = "healerji.bookmarks";

export function useBookmarks() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(BOOKMARK_KEY) ?? "[]"));
    } catch {
      setIds([]);
    }
  }, []);
  const toggle = (slug: string) => {
    setIds((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
      } catch {
        /* private mode — bookmarks live for this visit only */
      }
      return next;
    });
  };
  return { ids, toggle };
}

function Card({
  a,
  bookmarked,
  onBookmark,
}: {
  a: Article;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  return (
    <SpotlightCard as="article" className="group relative flex h-full flex-col rounded-md bg-surface-0 p-6 shadow-e-1 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2 dark:bg-night-900">
      <ArticleCover slug={a.slug} className="mb-5" ratio="aspect-[16/9]" lotusSize={70} />
      <p className="text-[13px] uppercase tracking-[0.14em] text-mist-500">
        {a.kind === "guide" ? "Guided practice" : "Article"} · {a.category} · {a.minutes} min
      </p>
      <h3 className="mt-2 font-display text-xl">
        <Link href={`/library/${a.slug}`} className="relative outline-none after:absolute after:inset-0 after:content-['']">
          {a.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-ink-600 dark:text-mist-400">{a.standfirst}</p>
      <button
        onClick={onBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? `Remove bookmark: ${a.title}` : `Bookmark ${a.title}`}
        className={cn(
          "relative z-10 mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors",
          bookmarked ? "bg-orchid-500/15 text-orchid-600" : "hairline text-ink-600 hover:bg-surface-100 dark:text-mist-400"
        )}
      >
        <Bookmark className={cn("h-3.5 w-3.5", bookmarked && "fill-current")} aria-hidden />
        {bookmarked ? "Saved" : "Save for later"}
      </button>
    </SpotlightCard>
  );
}

/**
 * DATABASE-BACKED as of pass 4.
 *
 * Articles now arrive as a prop from a server component reading Supabase. The
 * filtering, search and bookmarking behaviour is unchanged; only the source is.
 * Categories are derived from the data rather than a module-level constant, so a
 * new category created in the CMS appears in the filter without a code change.
 */
export function LibraryBrowser({ articles }: { articles: Article[] }) {
  const CATEGORIES = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const { ids, toggle } = useBookmarks();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "All" && a.category !== category) return false;
      if (kind !== "all" && a.kind !== kind) return false;
      if (savedOnly && !ids.includes(a.slug)) return false;
      if (q && !(a.title + a.standfirst + a.category).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [articles, query, category, kind, savedOnly, ids]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 basis-64">
          <span className="sr-only">Search the library</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search practices and articles…"
            className="h-12 w-full rounded-full bg-surface-0 pl-11 pr-5 shadow-e-1 outline-none ring-orchid-500 placeholder:text-mist-500 focus-visible:ring-2 dark:bg-night-900"
          />
        </label>
        <button
          onClick={() => setSavedOnly((v) => !v)}
          aria-pressed={savedOnly}
          className={cn(
            "flex h-12 items-center gap-2 rounded-full px-5 text-sm transition-colors",
            savedOnly ? "bg-plum-900 text-surface-0" : "hairline text-ink-600 hover:bg-surface-100 dark:text-mist-400"
          )}
        >
          <Bookmark className="h-4 w-4" aria-hidden /> Saved ({ids.length})
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => setKind(k.key)}
            aria-pressed={kind === k.key}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors",
              kind === k.key ? "bg-plum-900 text-surface-0" : "hairline text-ink-600 hover:bg-surface-100 dark:text-mist-400"
            )}
          >
            {k.label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px self-center bg-surface-200 sm:block" aria-hidden />
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors",
              category === c ? "bg-plum-900 text-surface-0" : "hairline text-ink-600 hover:bg-surface-100 dark:text-mist-400"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-8 text-sm text-mist-500" aria-live="polite">
        {results.length} piece{results.length === 1 ? "" : "s"}
      </p>

      {results.length === 0 ? (
        <div className="mt-8 rounded-md bg-surface-100 p-10 text-center dark:bg-night-900">
          <p className="font-display text-xl">Nothing here matches that — yet.</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-ink-600 dark:text-mist-400">
            {savedOnly
              ? "You haven't saved anything under these filters. Browse the full library and tap 'Save for later' on anything worth returning to."
              : "Try a broader search, or clear a filter — new pieces join the library regularly."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <li key={a.slug}>
              <Card a={a} bookmarked={ids.includes(a.slug)} onBookmark={() => toggle(a.slug)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
