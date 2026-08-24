import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectOr } from "@/lib/auth/redirects";

/**
 * The single return point for email confirmation, password reset and OAuth.
 *
 * Exchanging the code for a session happens server-side so the session lands
 * in an httpOnly cookie rather than in a URL fragment the browser history
 * keeps.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Same guard as every other redirect in the auth system.
  const next = safeRedirectOr(searchParams.get("next"), "/");

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?reason=missing_code`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/signin?reason=unconfigured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/signin?reason=link_expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
