import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Server client for Server Components, Route Handlers and Server Actions.
 * Reads the session from cookies, so RLS applies as the signed-in user.
 *
 * In a Server Component, cookie writes are not permitted; the try/catch is the
 * documented pattern for that case — middleware is what actually refreshes the
 * session cookie.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
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
}
