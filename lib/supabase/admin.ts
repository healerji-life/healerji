import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * The `server-only` import above is load-bearing: if any client component ever
 * imports this file, the build fails rather than shipping the key to a browser.
 *
 * Legitimate uses, and only these:
 *   - Razorpay webhook and payment verification (writing payments/refunds)
 *   - analytics ingestion (visitors must not be able to forge events)
 *   - admin exports and reporting over materialised views
 *   - inviting healers via the Auth admin API
 *
 * Anything a signed-in user does on their own behalf must use lib/supabase/server.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "healerji-server" } },
  });
}

/** True when server-side Supabase work is possible on this deployment. */
export const isAdminClientConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
