import { createClient, createStaticClient } from "@/lib/supabase/server";
import {
  err, fromPostgrestError, NOT_CONFIGURED, ok, range, safeSort, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import type { ArticleRow, ContentStatus } from "@/lib/supabase/types";

/**
 * Articles.
 *
 * Public reads go through the `published_articles` view, which is time-aware:
 * a scheduled piece becomes visible when its published_at arrives, with no cron
 * job. Admin reads hit the table directly and are gated by RLS to staff.
 */

export const ARTICLE_SORT_COLUMNS = ["published_at", "created_at", "updated_at", "title"] as const;
export type ArticleSortColumn = (typeof ARTICLE_SORT_COLUMNS)[number];

export interface ArticleFilters extends ListParams {
  status?: ContentStatus | "all";
  category?: string;
  pathway?: string;
  featured?: boolean;
}

/** Public list for /blog and /library. */
export async function listPublishedArticles(
  filters: ArticleFilters = {}
): Promise<Result<ArticleRow[]>> {
    // Static client: public, published content only. Using the cookie-bound
  // client here read cookies(), which opted the whole route into dynamic
  // rendering and silently defeated its `export const revalidate`.
  const supabase = createStaticClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  let query = supabase
    .from("published_articles")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.pathway) query = query.eq("pathway", filters.pathway);
  if (filters.featured) query = query.eq("featured", true);

  const { data, error } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load the journal.");
  return ok(data ?? []);
}

export async function getPublishedArticle(slug: string): Promise<Result<ArticleRow>> {
  const supabase = createStaticClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("published_articles").select("*").eq("slug", slug).maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that article.");
  return ok(data);
}

/** Slugs for generateStaticParams and the sitemap. */
export async function listPublishedArticleSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  if (!supabase) return [];
  const { data } = await supabase.from("published_articles").select("slug");
  return (data ?? []).map((row) => row.slug);
}

/** Admin list — every status, including drafts and archived. */
export async function listArticlesForAdmin(
  filters: ArticleFilters = {}
): Promise<Result<Paginated<ArticleRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);
  const sort = safeSort<ArticleSortColumn>(filters.sort, ARTICLE_SORT_COLUMNS, "updated_at");

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .order(sort, { ascending: (filters.direction ?? "desc") === "asc", nullsFirst: false })
    .range(from, to);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.featured) query = query.eq("featured", true);

  const term = sanitiseSearch(filters.search);
  if (term) {
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,author_name.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load articles.");
  return ok({ rows: data ?? [], total: count ?? 0, page, pageSize });
}

export async function getArticleById(id: string): Promise<Result<ArticleRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that article.");
  return ok(data);
}

export async function listArticleCategories(): Promise<Result<{ slug: string; name: string }[]>> {
    // Static client: public, published content only. Using the cookie-bound
  // client here read cookies(), which opted the whole route into dynamic
  // rendering and silently defeated its `export const revalidate`.
  const supabase = createStaticClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("article_categories").select("slug, name").eq("status", "active").order("display_order");
  if (error) return fromPostgrestError(error);
  return ok(data ?? []);
}
