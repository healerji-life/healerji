import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Languages, MessageCircle, Mic, ShieldCheck, Star, Video } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { AvatarArt } from "@/components/ui/avatar-art";
import { Reveal } from "@/components/reveal";
import { getPublicHealerForSite, listActiveHealerSlugs } from "@/lib/services/healers";
import { describeNextAvailable } from "@/lib/services/healer-adapter";
import { modalityBySlug } from "@/lib/data/modalities";
import { formatINR } from "@/lib/utils";
import type { SessionType } from "@/types";

/**
 * DATABASE-BACKED as of pass 2.
 *
 * Params are pre-rendered from the database at build time; `dynamicParams`
 * stays on (the default) so a healer added through the admin portal after a
 * deploy still resolves — it is rendered on demand and then cached.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listActiveHealerSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicHealerForSite(slug);
  if (!result.ok) return {};
  const healer = result.data;
  return {
    title: `${healer.name} — ${healer.headline}`,
    description: healer.bio.slice(0, 155),
  };
}

const sessionIcons: Record<SessionType, typeof Video> = {
  chat: MessageCircle,
  audio: Mic,
  video: Video,
};

export default async function HealerProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicHealerForSite(slug);
  if (!result.ok) notFound();
  const healer = result.data;

  const credibilityItems = [
    `${healer.years} years of practice in ${healer.modalities.length > 1 ? "their modalities" : "their modality"}`,
    healer.verified.credentials
      ? "Certification reviewed by the HealerJi panel"
      : "Experience-assessed by the HealerJi panel through a structured interview",
    healer.verified.interviewed && "Interviewed and vetted before their first session",
    `${healer.reviews} reviews from people they've worked with on HealerJi`,
  ].filter(Boolean) as string[];

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: healer.name,
    jobTitle: healer.headline,
    knowsLanguage: healer.languages,
    worksFor: { "@type": "Organization", name: "HealerJi" },
  };

  return (
    <div className="pb-40 pt-44">
      <Container className="grid gap-14 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <Reveal>
            <div className="flex items-center gap-6">
              <AvatarArt name={healer.name} size={96} />
              <div>
                <h1 className="text-3xl md:text-4xl">{healer.name}</h1>
                <p className="mt-2 text-ink-600 dark:text-mist-400">
                  {healer.headline}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-orchid-500 text-orchid-500" aria-hidden />
                  {healer.rating.toFixed(1)} · {healer.reviews} reviews, all from
                  completed sessions
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05} className="mt-10">
            <h2 className="text-xl">In their own words</h2>
            <p className="measure mt-3 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {healer.bio}
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-10">
            <h2 className="text-xl">Practices</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {healer.modalities.map((m) => {
                const mod = modalityBySlug(m);
                if (!mod) return null;
                return (
                  <li key={m}>
                    <Link
                      href={`/healing/${mod.slug}`}
                      className="block h-full rounded-md bg-surface-100/70 p-5 transition-colors hover:bg-surface-100 dark:bg-night-900"
                    >
                      <p className="font-display text-lg">{mod.name}</p>
                      <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
                        {mod.essence}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <h2 className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-orchid-600" aria-hidden />
              Why you can trust this healer
            </h2>
            <ul className="mt-4 space-y-2 text-ink-600 dark:text-mist-400">
              {credibilityItems.map((v) => (
                <li key={v} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-plum-800" aria-hidden />
                  {v}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-mist-500">
              <Link href="/trust" className="underline underline-offset-2">
                How HealerJi vets its panel of certified healers
              </Link>
            </p>
          </Reveal>
        </article>

        {/* Booking rail */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <Reveal className="rounded-md bg-surface-0 p-7 shadow-e-2 dark:bg-night-900">
            <p className="text-sm text-mist-500">Per session, from</p>
            <p className="mt-1 font-display text-3xl">{formatINR(healer.pricePaise)}</p>
            <p className="mt-3 text-sm text-mist-500">
              {describeNextAvailable(healer.nextAvailableAt)
                ? `Next available: ${describeNextAvailable(healer.nextAvailableAt)}`
                : "This healer hasn't published times yet."}
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm text-ink-600 dark:text-mist-400">
              <Languages className="h-4 w-4" aria-hidden />
              {healer.languages.join(" · ")}
            </div>

            <ul className="mt-4 flex gap-2" aria-label="Session types offered">
              {healer.sessionTypes.map((t) => {
                const Icon = sessionIcons[t];
                return (
                  <li
                    key={t}
                    className="flex items-center gap-1.5 rounded-full bg-plum-100 px-3 py-1.5 text-[13px] capitalize text-plum-900 dark:bg-night-950 dark:text-orchid-300"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {t}
                  </li>
                );
              })}
            </ul>

            <Button size="lg" className="mt-6 w-full" asChild>
              <Link href={`/book?healer=${healer.slug}`}>Book a session</Link>
            </Button>
            <p className="mt-4 text-center text-[13px] leading-relaxed text-mist-500">
              Joining HealerJi is free — you pay only for the sessions you
              book. Cancellations and refunds follow our{" "}
              <Link href="/legal/refunds" className="underline underline-offset-2">
                refund & pricing policy
              </Link>
              .
            </p>
          </Reveal>
        </aside>
      </Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
    </div>
  );
}
