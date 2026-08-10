import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { HealerCard } from "@/components/healer-card";
import { SeedSoundPlayer } from "@/components/chakra/seed-sound-player";
import { ChakraHero } from "@/components/motion/chakra-hero";
import { ChakraConcepts } from "@/components/motion/chakra-concepts";
import { ChakraFacets } from "@/components/motion/chakra-facets";
import { ChakraHeading, SectionBody } from "@/components/motion/section-reveal";
import { ChakraLotusFor } from "@/components/chakra/lotus";
import { chakras, chakraBySlug } from "@/lib/data/chakras";
import { modalityBySlug } from "@/lib/data/modalities";
import { listPublicHealersForSite } from "@/lib/services/healers";
import { listPublishedArticles } from "@/lib/services/articles";
import { toArticles } from "@/lib/services/article-adapter";
import { listPublishedPractices } from "@/lib/services/practices";
import { toPractices } from "@/lib/services/practice-adapter";
import { buildChakraTheme, themeVars } from "@/lib/chakra-theme";

export function generateStaticParams() {
  return chakras.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = chakraBySlug(slug);
  if (!c) return {};
  return {
    title: `${c.name} (${c.sanskrit}) — traditional location, meaning & practice`,
    description: `${c.meaning} Traditionally located at ${c.location.toLowerCase()}, with its seed sound ${c.bija}, symbolism, and the practices healers use with it.`,
  };
}

/** A card that inherits the page's computed foreground and border. */
function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-md border p-7 ${className ?? ""}`}
      style={{ borderColor: "var(--ck-border)", backgroundColor: "var(--ck-card)" }}
    >
      {title && (
        <h2 className="text-[0.8125rem] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--ck-muted)" }}>
          {title}
        </h2>
      )}
      <div className={title ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

export default async function ChakraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chakra = chakraBySlug(slug);
  if (!chakra) notFound();

  const theme = buildChakraTheme(chakra.color);
  const prev = chakras.find((c) => c.order === chakra.order - 1);
  const next = chakras.find((c) => c.order === chakra.order + 1);
  // DATABASE-BACKED as of pass 4. The chakra content itself is unchanged —
  // only the cross-links now come from Supabase.
  const [healerResult, articleResult, practiceResult] = await Promise.all([
    listPublicHealersForSite(),
    listPublishedArticles(),
    listPublishedPractices(),
  ]);
  const practices = practiceResult.ok ? toPractices(practiceResult.data) : [];
  const relatedHealers = (healerResult.ok ? healerResult.data : []).slice(0, 3);
  const publishedArticles = articleResult.ok ? toArticles(articleResult.data) : [];
  const relatedArticle =
    publishedArticles.find((a) => a.slug === "chakras-a-map-not-a-diagnosis") ?? publishedArticles[0];
  const relatedPractice =
    practices.find((p) => p.category === "Energy") ?? practices[0];

  return (
    /*
      The whole page runs on tokens computed from this centre's colour:
      background, foreground, muted, border, card. Foreground is chosen
      by contrast ratio, not by hand, so every one of the seven is
      legible without a single hard-coded white or black below.
    */
    <div
      className="grain relative pb-40"
      style={{ ...themeVars(theme), backgroundColor: theme.background, color: theme.foreground }}
    >
      {/* Layered field: base tone, soft radial glow, ambient aura */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[140svh] overflow-hidden">
        <div
          className="absolute left-1/2 top-[-10%] h-[90vmax] w-[90vmax] -translate-x-1/2 rounded-full blur-[130px] animate-breathe-slow"
          style={{ backgroundColor: chakra.color, opacity: 0.16 }}
        />
        <div
          className="absolute right-[-20%] top-[30%] h-[55vmax] w-[55vmax] rounded-full blur-[130px] animate-drift"
          style={{ backgroundColor: chakra.color, opacity: 0.08 }}
        />
      </div>

      <ChakraHero chakra={chakra} />

      {/* The editorial moment — three words, unfolding */}
      <ChakraConcepts chakra={chakra} />

      {/* The seed sound, at full size with its yantra */}
      <Container className="relative mt-8 max-w-4xl" id="seed">
        <Reveal>
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <ChakraLotusFor slug={chakra.slug} color={chakra.color} size={150} active />
            </div>
            <SeedSoundPlayer chakra={chakra} />
          </div>
          {chakra.bijaNote && (
            <p className="measure mt-5 text-[0.875rem]" style={{ color: theme.mutedForeground }}>
              {chakra.bijaNote}
            </p>
          )}
        </Reveal>
      </Container>

      {/* Meaning */}
      <Container className="relative mt-32 max-w-3xl space-y-16" id="meaning">
        {[
          ["In the body", chakra.bodyFocus],
          ["In the heart and mind", chakra.emotional],
          ["How healers work with it", chakra.healing],
        ].map(([h, body]) => (
          <div key={h}>
            <ChakraHeading text={h!} chakraSlug={chakra.slug} />
            <SectionBody>
              <p className="measure mt-4 text-lg leading-relaxed" style={{ color: theme.mutedForeground }}>
                {body}
              </p>
            </SectionBody>
          </div>
        ))}

        <Reveal>
          <ul className="flex flex-wrap gap-2">
            {chakra.modalities.map((m) => {
              const mod = modalityBySlug(m);
              if (!mod) return null;
              return (
                <li key={m}>
                  <Link
                    href={`/healing/${mod.slug}`}
                    className="inline-block rounded-full px-4 py-2 text-[0.9375rem] transition-opacity hover:opacity-80"
                    style={{ border: `1px solid ${theme.border}`, color: theme.foreground }}
                  >
                    {mod.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Container>

      {/* What this centre represents — explorable rather than tabulated */}
      <Container className="relative mt-24 max-w-4xl">
        <ChakraHeading text="What this centre represents" chakraSlug={chakra.slug} />
        <SectionBody className="mt-8">
          <ChakraFacets chakra={chakra} />
        </SectionBody>
      </Container>

      <Container className="relative mt-16 max-w-4xl">
        <div className="grid gap-5 md:grid-cols-2">
          <Panel title="Modern wellness interpretation">
            <dl className="space-y-3 text-[0.9375rem]">
              {[
                ["Gland", chakra.gland],
                ["Body", chakra.organs],
                ["Tone", `${chakra.frequency} Hz, used in contemporary sound practice`],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <dt className="w-28 shrink-0" style={{ color: theme.mutedForeground }}>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.8125rem]" style={{ color: theme.mutedForeground }}>
              These correspondences are twentieth-century additions to the
              tradition, offered as reflection rather than as anatomy.
            </p>
          </Panel>

          <Panel title="When it is over-expressed">
            <p style={{ color: theme.mutedForeground }}>{chakra.overactive}</p>
          </Panel>
          <Panel title="When it is under-expressed">
            <p style={{ color: theme.mutedForeground }}>{chakra.underactive}</p>
          </Panel>
        </div>
      </Container>

      {/* Practice */}
      <Container className="relative mt-24 max-w-4xl">
        <Reveal>
          <h2 className="text-2xl">Working with this centre</h2>
          <blockquote
            className="measure mt-6 border-l pl-6 font-display text-xl"
            style={{ borderColor: theme.accent }}
          >
            {chakra.affirmation}
          </blockquote>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Panel title="Breath">{chakra.breathwork}</Panel>
          <Panel title="Mudrā">{chakra.mudra}</Panel>
          <Panel title="Āsana">{chakra.asanas.join(" · ")}</Panel>
          <Panel title="Crystals & oils">
            {chakra.crystals.join(" · ")} — {chakra.oils.join(" · ")}
          </Panel>
          <Panel title="To write about" className="md:col-span-2">
            {chakra.journalPrompt}
          </Panel>
        </div>
      </Container>

      {/* Where to go next */}
      <Container className="relative mt-24 max-w-4xl">
        <div className="grid gap-5 md:grid-cols-3">
          {relatedPractice && (
            <Panel title="Guided practice">
              <p className="font-display text-lg">{relatedPractice.title}</p>
              <p className="mt-2 text-[0.9375rem]" style={{ color: theme.mutedForeground }}>
                {relatedPractice.minutes} minutes
              </p>
              <Link
                href={`/practices/${relatedPractice.slug}`}
                className="mt-4 inline-block underline underline-offset-[5px]"
                style={{ color: theme.accent }}
              >
                Begin →
              </Link>
            </Panel>
          )}
          {relatedArticle && (
            <Panel title="Read">
              <p className="font-display text-lg">{relatedArticle.title}</p>
              <p className="mt-2 text-[0.9375rem]" style={{ color: theme.mutedForeground }}>
                {relatedArticle.minutes} min
              </p>
              <Link
                href={`/library/${relatedArticle.slug}`}
                className="mt-4 inline-block underline underline-offset-[5px]"
                style={{ color: theme.accent }}
              >
                Open →
              </Link>
            </Panel>
          )}
          <Panel title="Live">
            <p className="font-display text-lg">Workshops</p>
            <p className="mt-2 text-[0.9375rem]" style={{ color: theme.mutedForeground }}>
              Practise this in company.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block underline underline-offset-[5px]"
              style={{ color: theme.accent }}
            >
              See sessions →
            </Link>
          </Panel>
        </div>
      </Container>

      {relatedHealers.length > 0 && (
        <Container className="relative mt-24">
          <Reveal>
            <h2 className="text-2xl">Healers who work here</h2>
          </Reveal>
          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {relatedHealers.map((h) => (
              <li key={h.slug}>
                <HealerCard healer={h} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="relative mt-24 max-w-3xl">
        <p className="measure rounded-md border p-5 text-[0.875rem]" style={{ borderColor: theme.border, color: theme.mutedForeground }}>
          The energy centres are a contemplative map from Indian tradition,
          not a medical description of the body. Practices here complement
          medical and mental-health care and never replace it.
        </p>

        <nav className="mt-12 flex items-center justify-between gap-4" aria-label="Other centres">
          {prev ? (
            <Button variant="secondary" asChild>
              <Link href={`/chakras/${prev.slug}`}>← {prev.name}</Link>
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button variant="secondary" asChild>
              <Link href={`/chakras/${next.slug}`}>{next.name} →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      </Container>
    </div>
  );
}
