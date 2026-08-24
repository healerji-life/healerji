import { createClient, createStaticClient } from "@/lib/supabase/server";
import {
  fromPostgrestError, NOT_CONFIGURED, ok, type Result,
} from "@/lib/services/types";
import type { TeamMemberRow } from "@/lib/supabase/types";

/**
 * Leadership and team.
 *
 * Previously a TypeScript array in lib/data/founder.ts, which meant a
 * deployment to change a designation. The public reader uses the cookie-free
 * client because the About page is statically rendered.
 */

/** Active members in display order — what the public About page renders. */
export async function listActiveTeam(): Promise<Result<TeamMemberRow[]>> {
  const supabase = createStaticClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    // Final tiebreak: display_order is not unique and two rows created in the
    // same transaction share a created_at, so without this the public order
    // could still differ between requests.
    .order("id", { ascending: true });

  if (error) return fromPostgrestError(error, "We couldn't load the team.");
  return ok(data ?? []);
}

/** Every member, any status — the admin list. */
export async function listTeamForAdmin(): Promise<Result<TeamMemberRow[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    // Final tiebreak: display_order is not unique and two rows created in the
    // same transaction share a created_at, so without this the public order
    // could still differ between requests.
    .order("id", { ascending: true });

  if (error) return fromPostgrestError(error, "We couldn't load the team.");
  return ok(data ?? []);
}

export async function getTeamMember(id: string): Promise<Result<TeamMemberRow>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return fromPostgrestError(error, "We couldn't load that team member.");
  if (!data) return fromPostgrestError({ code: "PGRST116" }, "We couldn't find that team member.");
  return ok(data);
}
