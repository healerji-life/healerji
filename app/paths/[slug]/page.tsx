import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { HealerCard } from "@/components/healer-card";
import { pathways, pathwayBySlug } from "@/lib/data/pathways";
import { modalityBySlug } from "@/lib/data/modalities";
import { listPublishedArticles } from "@/lib/services/articles";
import { toArticles } from "@/lib/services/article-adapter";
import { listPublicHealersForSite } from "@/lib/services/healers";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return pathways.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = pathwayBySlug(slug);
  if (!p) return {};
  return {
    title: `${p.name} — healing pathway`,
    description: `${p.line} Certified healers, honest practices, sessions in your language.`,
  };
}

export default async function PathwayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pathway = pathwayBySlug(slug);
  if (!pathway) notFound();

  const mods = pathway.modalitySlugs
    .map((m) => modalityBySlug(m))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  // DATABASE-BACKED as of pass 4.
  const [healerResult, articleResult] = await Promise.all([
    listPublicHealersForSite(),
    listPublishedArticles(),
  ]);
  const matched = (healerResult.ok ? healerResult.data : []).slice(0, 3);
  const allArticles = articleResult.ok ? toArticles(articleResult.data) : [];
  const byPathway = allArticles.filter((a) => a.pathway === pathway.slug);
  const related = byPathway.length > 0 ? byPathway : allArticles.slice(0, 2);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pathway.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="pb-40">
      <section className={cn("bg-gradient-to-br pt-44 pb-28", pathway.texture)}>
        <Container>
          <Reveal>
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
              Healing pathway · {pathway.nameHi}
            </p>
            <h1 className="mt-3 max-w-[16ch] text-4xl md:text-6xl">{pathway.name}</h1>
            <p className="measure mt-5 text-lg text-ink-600 md:text-xl">{pathway.line}</p>
          </Reveal>
        </Container>
      </section>

      <Container className="mt-16 max-w-3xl">
        <Reveal>
          <p className="measure text-lg leading-relaxed text-ink-600 dark:text-mist-400">
            {pathway.overview}
          </p>
        </Reveal>
      </Container>

      <Container className="mt-28">
        <Reveal>
          <h2 className="text-2xl">Practices on this pathway</h2>
        </Reveal>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mods.map((m, i) => (
            <Reveal as="li" key={m.slug} delay={i * 0.04}>
              <SpotlightCard className="h-full rounded-md">
              <Link
                href={`/healing/${m.slug}`}
                className="flex h-full flex-col rounded-md bg-surface-0 p-5 shadow-e-1 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2 dark:bg-night-900"
              >
                <span className="font-display text-lg">{m.name}</span>
                <span className="mt-1.5 text-sm text-ink-600 dark:text-mist-400">{m.essence}</span>
              </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </ul>
      </Container>

      {matched.length > 0 && (
        <Container className="mt-28">
          <Reveal>
            <h2 className="text-2xl">Healers for this pathway</h2>
          </Reveal>
          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {matched.map((h) => (
              <li key={h.slug}>
                <HealerCard healer={h} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="mt-28 grid gap-12 lg:grid-cols-2">
        <div>
          <Reveal>
            <h2 className="text-2xl">From the Journal</h2>
          </Reveal>
          <ul className="mt-6 space-y-4">
            {related.map((a) => (
              <Reveal as="li" key={a.slug}>
                <Link
                  href={`/library/${a.slug}`}
                  className="block rounded-md border border-surface-200 p-5 transition-colors hover:bg-surface-50 dark:border-night-900 dark:hover:bg-night-900"
                >
                  <p className="text-[13px] uppercase tracking-[0.14em] text-mist-500">
                    {a.category} · {a.minutes} min
                  </p>
                  <p className="mt-1 font-display text-lg">{a.title}</p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
        <div>
          <Reveal>
            <h2 className="text-2xl">Live, together</h2>
            <p className="measure mt-4 text-ink-600 dark:text-mist-400">
              Healers on this pathway also teach live — webinars and small
              workshops where you can practise in company and ask your
              questions at the end.
            </p>
            <Button variant="secondary" className="mt-5" asChild>
              <Link href="/events">See webinars & workshops</Link>
            </Button>
          </Reveal>
        </div>
      </Container>

      <Container className="mt-28 max-w-3xl">
        <Reveal>
          <h2 className="text-2xl">Questions people ask</h2>
        </Reveal>
        <div className="mt-6 divide-y divide-surface-200 dark:divide-night-900">
          {pathway.faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium marker:hidden">
                {f.q}
                <span className="ml-4 text-mist-500 transition-transform duration-200 group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="measure mt-3 text-ink-600 dark:text-mist-400">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>

      <Container className="mt-32 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-[20ch] text-3xl">Ready when you are.</h2>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href={`/healers?path=${pathway.concern}`}>Book a consultation</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/healy">Ask Healy first</Link>
            </Button>
          </div>
        </Reveal>
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
