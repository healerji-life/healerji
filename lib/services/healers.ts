import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  err, fromPostgrestError, NOT_CONFIGURED, ok, range, safeSort, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import type { HealerCardRow, HealerRow, SessionKind } from "@/lib/supabase/types";
import type { Healer } from "@/types";
import { toHealer } from "@/lib/services/healer-adapter";

/**
 * Healer data access.
 *
 * The public site reads through `healer_cards`, a view that carries only
 * public-safe columns. Admin screens read `healers` directly and are gated by
 * RLS, so this module contains no `if (role === 'admin')` checks — those would
 * be decoration.
 */

export const HEALER_SORT_COLUMNS = [
  "display_order", "name", "created_at", "updated_at", "price_paise", "years", "rating",
] as const;
export type HealerSortColumn = (typeof HEALER_SORT_COLUMNS)[number];

export interface HealerFilters extends ListParams {
  status?: HealerRow["status"] | "all";
  modality?: string;
  language?: string;
  sessionType?: SessionKind;
  featured?: boolean;
}

/** Public: the active healers rendered on /healers and the homepage. */
export async function listPublicHealers(
  filters: HealerFilters = {}
): Promise<Result<HealerCardRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  let query = supabase
    .from("healer_cards")
    .select("*")
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (filters.featured) query = query.eq("featured", true);
  if (filters.modality) query = query.contains("modalities", [filters.modality]);
  if (filters.language) query = query.contains("languages", [filters.language]);
  if (filters.sessionType) query = query.contains("session_types", [filters.sessionType]);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load the healers just now.");
  return ok(data ?? []);
}

export async function getPublicHealer(slug: string): Promise<Result<HealerCardRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("healer_cards")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that healer.");
  return ok(data);
}

/** Admin: every healer, whatever their status. RLS decides if the caller may. */
export async function listHealersForAdmin(
  filters: HealerFilters = {}
): Promise<Result<Paginated<HealerRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);
  const direction = filters.direction ?? "asc";
  const sort = safeSort<HealerSortColumn>(filters.sort, HEALER_SORT_COLUMNS, "display_order");

  let query = supabase
    .from("healers")
    .select("*", { count: "exact" })
    .order(sort, { ascending: direction === "asc" })
    .range(from, to);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  const term = sanitiseSearch(filters.search);
  if (term) {
    query = query.or(`name.ilike.%${term}%,headline.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load healers.");
  return ok({ rows: data ?? [], total: count ?? 0, page, pageSize });
}

export async function getHealerById(id: string): Promise<Result<HealerRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.from("healers").select("*").eq("id", id).maybeSingle();
  if (error) return fromPostgrestError(error);
  if (!data) return err("not_found", "We couldn't find that healer.");
  return ok(data);
}

export type HealerDraft = Partial<HealerRow> & { name: string; slug: string };

export async function createHealer(draft: HealerDraft): Promise<Result<HealerRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase.from("healers").insert(draft).select("*").single();
  if (error) return fromPostgrestError(error, "We couldn't create that healer.");
  return ok(data);
}

export async function updateHealer(
  id: string,
  patch: Partial<HealerRow>
): Promise<Result<HealerRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("healers").update(patch).eq("id", id).select("*").single();
  if (error) return fromPostgrestError(error, "We couldn't save those changes.");
  return ok(data);
}

/**
 * Archive, never delete (requirement 60). A healer with past bookings must
 * remain resolvable, otherwise the booking history becomes unreadable.
 */
export async function archiveHealer(id: string): Promise<Result<HealerRow>> {
  return updateHealer(id, { status: "archived", archived_at: new Date().toISOString() });
}

export async function restoreHealer(id: string): Promise<Result<HealerRow>> {
  return updateHealer(id, { status: "inactive", archived_at: null });
}

export async function setHealerModalities(
  healerId: string,
  modalitySlugs: string[]
): Promise<Result<null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error: delError } = await supabase
    .from("healer_modalities").delete().eq("healer_id", healerId);
  if (delError) return fromPostgrestError(delError);

  if (modalitySlugs.length === 0) return ok(null);

  const { error } = await supabase.from("healer_modalities").insert(
    modalitySlugs.map((slug, i) => ({ healer_id: healerId, modality_slug: slug, display_order: i }))
  );
  if (error) return fromPostgrestError(error, "We couldn't save the modalities.");
  return ok(null);
}

export async function setHealerLanguages(
  healerId: string,
  languageCodes: string[]
): Promise<Result<null>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { error: delError } = await supabase
    .from("healer_languages").delete().eq("healer_id", healerId);
  if (delError) return fromPostgrestError(delError);

  if (languageCodes.length === 0) return ok(null);

  const { error } = await supabase.from("healer_languages").insert(
    languageCodes.map((code, i) => ({ healer_id: healerId, language_code: code, display_order: i }))
  );
  if (error) return fromPostgrestError(error, "We couldn't save the languages.");
  return ok(null);
}

/**
 * Invite a healer to the portal.
 *
 * The admin never chooses or sees a password (requirement 24). Supabase sends
 * an invitation link; the healer sets their own credential. This needs the
 * service role because it calls the Auth admin API.
 */
export async function inviteHealer(
  healerId: string,
  email: string,
  redirectTo: string
): Promise<Result<{ invited: boolean }>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (inviteError || !invited?.user) {
    return err("upstream", "We couldn't send that invitation.", inviteError?.message);
  }

  // Link the new account to the healer record and grant the healer role.
  const { error: linkError } = await admin
    .from("healers").update({ user_id: invited.user.id }).eq("id", healerId);
  if (linkError) return fromPostgrestError(linkError, "The invitation was sent but not linked.");

  const { error: roleError } = await admin
    .from("user_roles").insert({ user_id: invited.user.id, role: "healer" });
  if (roleError && roleError.code !== "23505") {
    return fromPostgrestError(roleError, "The invitation was sent but the role was not granted.");
  }

  await admin.from("healer_invitations").insert({ healer_id: healerId, email });

  return ok({ invited: true });
}


/**
 * The public listing, in the shape the existing components expect, with real
 * next-available times attached.
 *
 * One query for the cards and one for availability — not one per card. If the
 * availability lookup fails the cards still render, with nextAvailableAt null,
 * because a missing "next available" line is far better than a blank page.
 */
export async function listPublicHealersForSite(
  filters: HealerFilters = {}
): Promise<Result<Healer[]>> {
  const cards = await listPublicHealers(filters);
  if (!cards.ok) return cards;
  if (cards.data.length === 0) return ok([]);

  const supabase = await createClient();
  if (!supabase) return ok(cards.data.map((row) => toHealer(row, null)));

  const { data, error } = await supabase.rpc("healers_next_available", {
    p_slugs: cards.data.map((c) => c.slug),
    p_days_ahead: 14,
  });

  const nextBySlug = new Map<string, string | null>();
  if (!error) {
    for (const row of data ?? []) nextBySlug.set(row.slug, row.next_available);
  }

  return ok(cards.data.map((row) => toHealer(row, nextBySlug.get(row.slug) ?? null)));
}

/** A single public profile, with its next open slot. */
export async function getPublicHealerForSite(slug: string): Promise<Result<Healer>> {
  const card = await getPublicHealer(slug);
  if (!card.ok) return card;

  const supabase = await createClient();
  if (!supabase) return ok(toHealer(card.data, null));

  const { data, error } = await supabase.rpc("healer_next_available", {
    p_healer_slug: slug,
    p_days_ahead: 14,
  });

  return ok(toHealer(card.data, error ? null : (data ?? null)));
}

/** Slugs for generateStaticParams / sitemap. */
export async function listActiveHealerSlugs(): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("healers").select("slug").eq("status", "active");
  return (data ?? []).map((row) => row.slug);
}
