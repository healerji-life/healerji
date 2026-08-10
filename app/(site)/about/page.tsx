import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { founder, leadership, visionMission } from "@/lib/data/founder";
import { listActiveTeam } from "@/lib/services/team";

export const metadata: Metadata = {
  title: "Our story — founded by Poonam Khetan",
  description:
    "HealerJi was founded by educator and certified healer Poonam Khetan to give India's certified healers and the people who need them one trusted home. Meet the founder and leadership.",
};

/**
 * The leadership grid is CMS-managed (admin → Team). The hardcoded array in
 * lib/data/founder.ts remains as the fallback for a deployment whose database
 * has not had the team_members migration applied yet, so the section can never
 * render empty. The migration seeds exactly these three people, which is why
 * the two agree.
 */
async function teamForDisplay() {
  const result = await listActiveTeam();
  if (!result.ok || result.data.length === 0) {
    return leadership.map((p) => ({
      key: p.name, name: p.name, role: p.role,
      photo: p.photo, bio: p.bio, linkedin: p.linkedin,
    }));
  }
  return result.data.map((p) => ({
    key: p.id, name: p.name, role: p.role,
    photo: p.photo_url, bio: p.bio, linkedin: p.linkedin_url,
  }));
}

export default async function AboutPage() {
  const team = await teamForDisplay();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `${founder.name}`,
    jobTitle: "Founder, Director & CEO",
    worksFor: { "@type": "Organization", name: "HealerJi" },
    sameAs: [founder.linkedin],
  };

  return (
    <div className="pb-40">
      {/* Editorial hero: wide graded photograph, magazine masthead type */}
      <section className="relative pt-24">
        <Container>
          <Reveal>
            <h1 className="max-w-[16ch] pt-12 text-4xl md:text-6xl">
              The educator who built a home for healing.
            </h1>
            <p className="measure mt-6 text-lg text-ink-600 dark:text-mist-400 md:text-xl">
              HealerJi is founder-led in the oldest sense: built by a
              practitioner, for practitioners and the people they serve.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-14">
            <figure>
              <Image
                src={founder.wide}
                alt={`${founder.honorific} ${founder.name} meditating in a garden, wearing a HealerJi shirt`}
                width={1800}
                height={1125}
                priority
                className="w-full rounded-lg object-cover shadow-e-2"
                sizes="(min-width: 1280px) 1152px, 94vw"
              />
              <figcaption className="mt-3 text-right text-sm text-mist-500">
                {founder.honorific} {founder.name} · {founder.role}
              </figcaption>
            </figure>
          </Reveal>
        </Container>
      </section>

      {/* Her story — large-measure editorial prose */}
      <Container className="mt-32 grid gap-14 lg:grid-cols-[1fr_2fr]">
        <Reveal className="lg:sticky lg:top-32 lg:h-fit">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            The story
          </p>
          <h2 className="mt-3 text-2xl">From the classroom to the healing room</h2>
          <a
            href={founder.linkedin}
            rel="noopener"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30"
          >
            Connect with Dr. Khetan on LinkedIn
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Reveal>
        <div className="space-y-6">
          {founder.story.map((para, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="measure text-lg leading-relaxed text-ink-600 first:font-display first:text-xl first:text-ink-900 dark:text-mist-400 dark:first:text-surface-0">
                {para}
              </p>
            </Reveal>
          ))}
          <Reveal delay={0.2}>
            <p className="measure text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {founder.education} The platform&rsquo;s standards were written by
              someone who has sat on both sides of a healing session.
            </p>
          </Reveal>

          {/* Credentials, given the weight they carry */}
          <Reveal delay={0.26} className="!mt-16">
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
              Practitioner credentials
            </p>
            <dl className="mt-8">
              {founder.credentials.map((c) => (
                <div
                  key={c.title}
                  className="grid gap-2 border-t border-ink-900/10 py-6 dark:border-surface-0/10 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-10"
                >
                  <dt className="font-display text-lg text-ink-900 dark:text-surface-0">
                    {c.title}
                  </dt>
                  <dd className="text-ink-600 dark:text-mist-400">{c.note}</dd>
                </div>
              ))}
              <div className="border-t border-ink-900/10 dark:border-surface-0/10" />
            </dl>
          </Reveal>
        </div>
      </Container>

      {/* Personal message — pull-quote treatment */}
      <section className="mt-28 bg-plum-900 py-24 text-surface-0">
        <Container className="grid items-center gap-12 lg:grid-cols-[auto_1fr]">
          <Reveal className="mx-auto">
            <Image
              src={founder.square}
              alt={`Portrait of ${founder.name}`}
              width={220}
              height={220}
              className="h-44 w-44 rounded-full object-cover ring-1 ring-surface-0/25 md:h-52 md:w-52"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <blockquote className="max-w-3xl font-display text-2xl leading-snug md:text-3xl">
              "{founder.message}"
            </blockquote>
            <p className="mt-6 text-orchid-300">
              — {founder.honorific} {founder.name}, Founder
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Vision & mission — HealerJi's own published words, elevated */}
      <Container className="mt-28 grid gap-10 md:grid-cols-2">
        <Reveal className="rounded-lg bg-surface-100 p-10 dark:bg-night-900">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">Vision</p>
          <p className="mt-4 font-display text-xl leading-relaxed">{visionMission.vision}</p>
        </Reveal>
        <Reveal delay={0.06} className="rounded-lg bg-surface-100 p-10 dark:bg-night-900">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">Mission</p>
          <p className="mt-4 font-display text-xl leading-relaxed">{visionMission.mission}</p>
        </Reveal>
      </Container>

      {/* Impact beyond the platform */}
      <Container className="mt-32">
        <Reveal className="rounded-lg border border-orchid-200/60 bg-orchid-500/5 p-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orchid-600">
            Beyond HealerJi
          </p>
          <p className="measure mt-4 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
            {founder.impact}
          </p>
        </Reveal>
      </Container>

      {/* Leadership — real people, real photographs from healerji.com */}
      <Container className="mt-28">
        <Reveal>
          <h2 className="text-3xl">The people beside her</h2>
          <p className="measure mt-3 text-lg text-ink-600 dark:text-mist-400">
            A leadership team that pairs healing credibility with three decades
            of financial-services, technology and audit experience.
          </p>
        </Reveal>
        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {team.map((person, i) => (
            <Reveal as="li" key={person.key} delay={i * 0.06}>
              <article>
                {person.photo ? (
                  <Image
                    src={person.photo}
                    alt={`Portrait of ${person.name}`}
                    width={400}
                    height={400}
                    className="aspect-square w-full rounded-md object-cover"
                    sizes="(min-width: 768px) 30vw, 90vw"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-md bg-surface-50 dark:bg-night-900" />
                )}
                <h3 className="mt-5 font-display text-xl">{person.name}</h3>
                <p className="text-sm text-mist-500">{person.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-mist-400">
                  {person.bio}
                </p>
                {person.linkedin ? (
                <a
                  href={person.linkedin}
                  rel="noopener"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30"
                >
                  LinkedIn
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                ) : null}
              </article>
            </Reveal>
          ))}
        </ul>
      </Container>

      <Container className="mt-28 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-[22ch] text-3xl md:text-4xl">
            The best way to understand HealerJi is a conversation.
          </h2>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/healers">Find your healer</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/chakras">Explore the chakra map</Link>
            </Button>
          </div>
        </Reveal>
      </Container>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
