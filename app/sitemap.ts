import type { MetadataRoute } from "next";
import { modalities } from "@/lib/data/modalities";
import { chakras } from "@/lib/data/chakras";
import { listActiveHealerSlugs } from "@/lib/services/healers";
import { pathways } from "@/lib/data/pathways";
import { listPublishedArticleSlugs } from "@/lib/services/articles";
import { listPublishedPracticeSlugs } from "@/lib/services/practices";
import { legalDocs } from "@/lib/data/legal";
import { SITE_URL } from "@/lib/config/site";

// Resolved from NEXT_PUBLIC_SITE_URL / the Vercel domain, never hardcoded:
// a sitemap advertising a host that does not serve these routes is worse than
// no sitemap at all.
const BASE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [healerSlugs, articleSlugs, practiceSlugs] = await Promise.all([
    listActiveHealerSlugs(),
    listPublishedArticleSlugs(),
    listPublishedPracticeSlugs(),
  ]);
  const statics = [
    "", "/healing", "/chakras", "/healers", "/library", "/practices", "/blog", "/community", "/events",
    "/healy", "/about", "/for-business", "/become-a-healer", "/partner", "/affiliate",
    "/pricing", "/stories", "/trust", "/support", "/contact", "/careers", "/press",
    "/app", "/book", "/bookings", "/signin", "/accessibility",
    "/legal/privacy", "/legal/terms", "/legal/refunds", "/legal/cookies",
  ].map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const }));

  return [
    ...statics,
    ...modalities.map((m) => ({ url: `${BASE}/healing/${m.slug}`, changeFrequency: "monthly" as const })),
    ...chakras.map((c) => ({ url: `${BASE}/chakras/${c.slug}`, changeFrequency: "monthly" as const })),
    ...healerSlugs.map((slug) => ({ url: `${BASE}/healers/${slug}`, changeFrequency: "weekly" as const })),
    ...pathways.map((p) => ({ url: `${BASE}/paths/${p.slug}`, changeFrequency: "monthly" as const })),
    ...articleSlugs.map((slug) => ({ url: `${BASE}/library/${slug}`, changeFrequency: "monthly" as const })),
    ...practiceSlugs.map((slug) => ({ url: `${BASE}/practices/${slug}`, changeFrequency: "monthly" as const })),
    ...legalDocs.map((d) => ({ url: `${BASE}/legal/${d.slug}`, changeFrequency: "yearly" as const })),
  ];
}
