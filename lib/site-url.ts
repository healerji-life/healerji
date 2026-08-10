import "server-only";
import { headers } from "next/headers";

/**
 * The one place an absolute application URL is decided.
 *
 * Every email and OAuth redirect needs a base URL, and getting it wrong is not
 * cosmetic: an invitation that points at localhost is an invitation nobody can
 * accept. Before this existed, each caller read a hidden `origin` form field.
 * The pages filled that field from the request, so the value was usually right,
 * but it still arrived from the browser — and a redirect target that a client
 * can set is a redirect target an attacker can set. The only thing standing
 * between that and a phishing link was Supabase's redirect allowlist.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — an explicit override, for a custom domain.
 *   2. The forwarded host of the current request. On Vercel this is the domain
 *      the admin is actually using, which is what their invitation should
 *      match, including on preview deployments.
 *   3. VERCEL_PROJECT_PRODUCTION_URL — for a server context with no request.
 *   4. localhost, for local development only. Unreachable in production,
 *      because Vercel always supplies at least a forwarded host.
 */
export async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    return stripTrailingSlash(`${proto}://${host}`);
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionHost) return `https://${productionHost}`;

  // Refuse rather than mint a localhost link a recipient could never open.
  // Reaching this in production would mean no request host and no Vercel
  // environment, so failing loudly beats emailing an unusable invitation.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Cannot determine the site URL: no request host, and neither " +
        "NEXT_PUBLIC_SITE_URL nor VERCEL_PROJECT_PRODUCTION_URL is set."
    );
  }

  return "http://localhost:3000";
}

/** An absolute URL for `path`, which must be site-absolute ("/healer"). */
export async function absoluteUrl(path: string): Promise<string> {
  const base = await siteUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
