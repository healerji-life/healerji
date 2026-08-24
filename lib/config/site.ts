/**
 * The public origin of this deployment — the one source of truth for every
 * crawler-facing absolute URL.
 *
 * Before this existed, `https://healerji.com` was hardcoded in three places
 * (metadataBase, the sitemap and robots) while the application was actually
 * served from a Vercel domain. That published a sitemap of URLs pointing at a
 * host which does not run this app, and made every page's og:url claim the
 * homepage of a different site.
 *
 * Resolution order, most explicit first:
 *   1. NEXT_PUBLIC_SITE_URL — set this to flip the canonical domain. It is the
 *      only thing that needs to change to cut over to a custom domain; no code
 *      edit is required.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's stable production domain.
 *      Preferred over VERCEL_URL because it does not change per deployment.
 *   3. VERCEL_URL — the per-deployment URL. Correct for a preview build, and
 *      deliberately last because it would otherwise make every deployment
 *      advertise a different canonical.
 *   4. localhost, for local development.
 *
 * This is deliberately request-independent: `sitemap.ts`, `robots.ts` and the
 * root `metadata` export all run in contexts where `headers()` is unavailable
 * or would force dynamic rendering. `lib/site-url.ts` remains the
 * request-aware resolver, and is still the right choice for emails and OAuth
 * redirects, which must match the host the recipient actually used.
 */

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolve(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${stripTrailingSlash(productionHost)}`;

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return `https://${stripTrailingSlash(deploymentHost)}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolve();

/** An absolute URL for a site-absolute path ("/healers"). */
export function siteAbsoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
