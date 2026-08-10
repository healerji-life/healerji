import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";

/**
 * Session refresh + the first gate on /admin and /healer.
 *
 * Two things this is NOT:
 *  - It is not the authorisation boundary. Middleware runs before RLS and can
 *    be bypassed by hitting an API route directly, so every page and handler
 *    re-checks with requireAdmin()/requireHealer() and the database enforces
 *    the real rule. This exists to send people somewhere sensible.
 *  - It does not read roles from a cookie or a client-supplied header. Role
 *    lookup is a query against user_roles under RLS.
 */

const ADMIN_PREFIX = "/admin";
const HEALER_PREFIX = "/healer";
const ADMIN_LOGIN = "/admin/login";
const HEALER_LOGIN = "/healer/login";

const PUBLIC_AUTH_PATHS = new Set([ADMIN_LOGIN, HEALER_LOGIN]);

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  const isProtected =
    (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`) ||
     pathname === HEALER_PREFIX || pathname.startsWith(`${HEALER_PREFIX}/`)) &&
    !PUBLIC_AUTH_PATHS.has(pathname);

  // Not configured: a protected route must fail closed, never open.
  if (!url || !key) {
    if (isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = pathname.startsWith(HEALER_PREFIX) ? HEALER_LOGIN : ADMIN_LOGIN;
      to.search = "?reason=unconfigured";
      return NextResponse.redirect(to);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates with the auth server. getSession() would only decode
  // the cookie, which an attacker controls.
  const { data: { user } } = await supabase.auth.getUser();

  if (!isProtected) return response;

  const loginPath = pathname.startsWith(HEALER_PREFIX) ? HEALER_LOGIN : ADMIN_LOGIN;

  if (!user) {
    const to = request.nextUrl.clone();
    to.pathname = loginPath;
    to.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(to);
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = new Set((roleRows ?? []).map((r) => r.role as string));

  const allowed = pathname.startsWith(HEALER_PREFIX)
    ? roles.has("healer") || roles.has("super_admin") || roles.has("admin")
    : roles.has("super_admin") || roles.has("admin") || roles.has("editor");

  if (!allowed) {
    const to = request.nextUrl.clone();
    to.pathname = loginPath;
    to.search = "?reason=forbidden";
    return NextResponse.redirect(to);
  }

  // Defence in depth for the browser cache: an authenticated portal page must
  // not be served from bfcache after sign-out.
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation. The session
     * cookie must be refreshed on normal page loads too, not only on /admin.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
