import { cookies } from "next/headers";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Server client for Server Components, Route Handlers and Server Actions.
 * Reads the session from cookies, so RLS applies as the signed-in user.
 *
 * In a Server Component, cookie writes are not permitted; the try/catch is the
 * documented pattern for that case — middleware is what actually refreshes the
 * session cookie.
 *
 * The return type is named explicitly, and the client re-cast onto it, because
 * the installed @supabase/ssr still declares its result as
 * SupabaseClient<Database, SchemaName, Schema> while supabase-js has since
 * inserted a parameter ahead of SchemaName. The schema object therefore lands
 * in the slot expecting a schema *name*, Schema resolves to never, and every
 * table, view and rpc types as never at the call sites. Runtime is unaffected;
 * this only restores the type the library used to hand back.
 */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  const client = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component. Safe to ignore: middleware
          // refreshes the session on every request.
        }
      },
    },
  });

  return client as unknown as SupabaseClient<Database>;
}

/**
 * Anonymous client with no cookie binding.
 *
 * generateStaticParams and the sitemap run during the build, where there is no
 * request and cookies() throws. They only ever read public rows — active
 * healers, published articles and practices — so they use this: same anon key,
 * same Row Level Security, no session to read.
 */
export function createStaticClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
