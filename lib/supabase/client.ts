import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser client. Uses the anon key, which is public by design — every query
 * it makes is still subject to Row Level Security.
 *
 * Returns null when Supabase is not configured, so the site degrades to a
 * clear "not configured" state instead of throwing on import.
 */
export function createClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  // Re-cast for the same @supabase/ssr generic skew documented in server.ts.
  return createBrowserClient<Database>(url, key) as unknown as SupabaseClient<Database>;
}
