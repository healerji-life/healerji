import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/auth/session";
import { primaryRole } from "@/lib/auth/roles";

/**
 * Audit log writer.
 *
 * The table itself is append-only (a trigger blocks UPDATE and DELETE) and a
 * second trigger strips anything that looks like a credential from the payload
 * before it lands. This function therefore cannot be the weak point even if a
 * future caller passes something careless.
 *
 * Deliberately returns void and swallows failures: an audit write must never
 * be the reason a legitimate admin action fails. Failures are logged.
 */
export async function recordAudit(params: {
  viewer: Viewer;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    const headerList = await headers();

    const { error } = await supabase.from("admin_audit_logs").insert({
      actor_id: params.viewer.id,
      actor_email: params.viewer.email,
      actor_role: primaryRole(params.viewer.roles),
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      summary: params.summary ?? null,
      before_data: (params.before ?? null) as never,
      after_data: (params.after ?? null) as never,
      user_agent: headerList.get("user-agent"),
    });

    if (error) console.error("audit write failed", params.action, error.message);
  } catch (error) {
    console.error("audit write threw", error);
  }
}

/** Canonical action names, so the audit log filter has a fixed vocabulary. */
export const AUDIT_ACTIONS = {
  healerCreated: "healer.created",
  healerUpdated: "healer.updated",
  healerArchived: "healer.archived",
  healerRestored: "healer.restored",
  healerInvited: "healer.invited",
  healerImported: "healer.imported",
  priceChanged: "healer.price_changed",
  availabilityChanged: "availability.changed",
  bookingCancelled: "booking.cancelled",
  bookingRefunded: "booking.refunded",
  blogCreated: "blog.created",
  blogUpdated: "blog.updated",
  blogPublished: "blog.published",
  blogUnpublished: "blog.unpublished",
  blogArchived: "blog.archived",
  blogImported: "blog.imported",
  roleChanged: "user.role_changed",
  userSuspended: "user.suspended",
  settingChanged: "settings.changed",
  dataExported: "data.exported",
} as const;

// ------------------------------------------------------------- reading ------

import {
  fromPostgrestError, NOT_CONFIGURED, ok, range, sanitiseSearch,
  type ListParams, type Paginated, type Result,
} from "@/lib/services/types";
import type { AuditLogRow } from "@/lib/supabase/types";

export interface AuditFilters extends ListParams {
  actor?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

/**
 * Reads the audit log.
 *
 * RLS restricts SELECT to is_admin(), and the table rejects UPDATE and DELETE
 * outright via block_audit_mutation(), so there is deliberately no write path
 * here beyond recordAudit's insert. An audit log an operator can edit is not an
 * audit log.
 */
export async function listAuditLog(
  filters: AuditFilters = {}
): Promise<Result<Paginated<AuditLogRow>>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { from, to, page, pageSize } = range(filters);

  let query = supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.actor) query = query.eq("actor_id", filters.actor);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.resourceType) query = query.eq("resource_type", filters.resourceType);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const term = sanitiseSearch(filters.search);
  if (term) query = query.or(`summary.ilike.%${term}%,actor_email.ilike.%${term}%,resource_id.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) return fromPostgrestError(error, "We couldn't load the audit log.");
  return ok({ rows: data ?? [], total: count ?? 0, page, pageSize });
}

/** Distinct actors and actions, for the filter dropdowns. */
export async function getAuditFacets(): Promise<Result<{
  actors: { id: string; email: string }[];
  actions: string[];
  resourceTypes: string[];
}>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  // Postgrest has no DISTINCT, so this reads a bounded recent window and
  // de-duplicates in memory. Cheap, and enough for a filter list.
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("actor_id, actor_email, action, resource_type")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return fromPostgrestError(error);

  const actors = new Map<string, string>();
  const actions = new Set<string>();
  const resourceTypes = new Set<string>();

  for (const row of data ?? []) {
    if (row.actor_id && row.actor_email) actors.set(row.actor_id, row.actor_email);
    if (row.action) actions.add(row.action);
    if (row.resource_type) resourceTypes.add(row.resource_type);
  }

  return ok({
    actors: [...actors].map(([id, email]) => ({ id, email })),
    actions: [...actions].sort(),
    resourceTypes: [...resourceTypes].sort(),
  });
}
