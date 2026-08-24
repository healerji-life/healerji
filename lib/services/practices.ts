import { createClient, createStaticClient } from "@/lib/supabase/server";
import {
  err, fromPostgrestError, NOT_CONFIGURED, ok, range, safeSort, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import type { ContentStatus, PracticeRow } from "@/lib/supabase/types";

/**
 * Guided practices.
 *
 * Public reads go through `published_practices`, which is time-aware, so a
 * scheduled practice appears when its date arrives and unpublishing removes it
 * from the site with no further action. Admin reads hit the table and are gated
 * to staff by RLS.
 */

export const PRACTICE_SORT_COLUMNS = ["display_order", "title", "created_at", "updated_at", "minutes"] as const;
export type PracticeSortColumn = (typeof PRACTICE_SORT_COLUMNS)[number];

export interface PracticeFilters extends ListParams {
  status?: ContentStatus | "all";
  category?: string;
  featured?: boolean;
}

export async function listPublishedPractices(
  filters: PracticeFilters = {}
): Promise<Result<PracticeRow[]>> {
    // Static client: public, published content only. Using the cookie-bound
  // client here read cookies(), which opted the whole route into dynamic
  // rendering and silently defeated its `export const revalidate`.
  const supabase = createStaticClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  let query = supabase
    .from("published_practices")
    .select("*")
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.featured) query = query.eq("featured", true);

  const { data, error } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load the practices.");
  return ok(data ?? []);
}

export async function getPublishedPractice(slug: string): Promise<Result<PracticeRow>> {
  const supabase = createStaticClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("published_practices").select("*").eq("slug", slug).maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that practice.");
  return ok(data);
}

export async function listPublishedPracticeSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  if (!supabase) return [];
  const { data } = await supabase.from("published_practices").select("slug");
  return (data ?? []).map((row) => row.slug);
}

// ------------------------------------------------------------------ admin ----

export async function listPracticesForAdmin(
  filters: PracticeFilters = {}
): Promise<Result<Paginated<PracticeRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);
  const sort = safeSort<PracticeSortColumn>(filters.sort, PRACTICE_SORT_COLUMNS, "display_order");

  let query = supabase
    .from("practices")
    .select("*", { count: "exact" })
    .order(sort, { ascending: (filters.direction ?? "asc") === "asc" })
    .range(from, to);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category", filters.category);

  const term = sanitiseSearch(filters.search);
  if (term) query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,summary.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load practices.");
  return ok({ rows: data ?? [], total: count ?? 0, page, pageSize });
}

export async function getPracticeById(id: string): Promise<Result<PracticeRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.from("practices").select("*").eq("id", id).maybeSingle();
  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that practice.");
  return ok(data);
}
