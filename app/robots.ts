import type { MetadataRoute } from "next";
import { siteAbsoluteUrl } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/healer"] },
    sitemap: siteAbsoluteUrl("/sitemap.xml"),
  };
}
