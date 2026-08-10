import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Inter, Inter_Tight, Tiro_Devanagari_Hindi } from "next/font/google";
import "@/styles/globals.css";
import { AnalyticsTracker } from "@/components/analytics/tracker";

/**
 * One family, two optical cuts. Inter Tight carries display sizes with
 * the tight, even colour of a grotesque set by hand; Inter carries text
 * at a comfortable reading rhythm. Restraint over personality — the
 * typography should feel inevitable rather than chosen.
 */
const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const text = Inter({
  subsets: ["latin"],
  variable: "--font-text",
  display: "swap",
});
const tiro = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari"],
  variable: "--font-tiro",
  display: "swap",
});
const anek = Anek_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-anek",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://healerji.com"),
  title: {
    default: "HealerJi — Certified healers for health, relationships, career, money & emotional wellbeing",
    template: "%s · HealerJi",
  },
  description:
    "Connect with certified healers for Reiki, chakra healing, spiritual healing, inner-child work and coaching — over chat, audio or video, in your language. Free to join; pay per session.",
  openGraph: {
    type: "website",
    siteName: "HealerJi",
    locale: "en_IN",
    url: "https://healerji.com",
    title: "HealerJi — You don't have to carry it alone",
    description:
      "Certified healers over chat, audio or video — for health, relationships, career, money, and emotions.",
  },
  twitter: { card: "summary_large_image", site: "@Healer_ji" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F7F8" },
    { media: "(prefers-color-scheme: dark)", color: "#150D18" },
  ],
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HealerJi",
  legalName: "Sattveda Wellness Technology Private Limited",
  url: "https://healerji.com",
  logo: "https://healerji.com/brand/lockup.svg",
  address: {
    "@type": "PostalAddress",
    streetAddress: "M-5, Essel House, 10 Asaf Ali Road",
    addressLocality: "New Delhi",
    postalCode: "110002",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.linkedin.com/company/healerji/",
    "https://www.instagram.com/healerji.life",
    "https://x.com/Healer_ji",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${tiro.variable} ${anek.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-plum-800 focus:px-5 focus:py-2.5 focus:text-surface-0"
        >
          Skip to content
        </a>
        {/*
          Analytics.

          Wrapped in Suspense because the tracker reads useSearchParams(), which
          opts a component into client rendering — without the boundary that
          would force the entire route tree to render dynamically and lose static
          generation on every public page.

          It renders nothing. If SUPABASE_SERVICE_ROLE_KEY is absent the collector
          answers 202 and drops the event, so an unconfigured deployment behaves
          exactly like one with no traffic rather than erroring in the console.
        */}
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
