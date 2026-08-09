import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { HealerCard } from "@/components/healer-card";
import { modalities, modalityBySlug } from "@/lib/data/modalities";
import { listPublicHealersForSite } from "@/lib/services/healers";

export function generateStaticParams() {
  return modalities.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = modalityBySlug(slug);
  if (!m) return {};
  return { title: `${m.name} — what it is, honestly`, description: m.essence };
}

export default async function ModalityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = modalityBySlug(slug);
  if (!m) notFound();

  // DATABASE-BACKED as of pass 4: filtered by the modality in Postgres rather
  // than over a static array, so a healer added in admin appears here.
  const practitionerResult = await listPublicHealersForSite({ modality: m.slug });
  const practitioners = practitionerResult.ok ? practitionerResult.data : [];

  return (
    <div className="pb-40 pt-44">
      <Container className="max-w-3xl">
        <Reveal>
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            Healing library
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl">{m.name}</h1>
          <p className="mt-4 text-xl text-ink-600 dark:text-mist-400">{m.essence}</p>
        </Reveal>

        <div className="mt-14 space-y-12">
          <Reveal>
            <h2 className="text-2xl">What it is</h2>
            <p className="measure mt-3 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {m.what}
            </p>
          </Reveal>
          <Reveal>
            <h2 className="text-2xl">What a session feels like</h2>
            <p className="measure mt-3 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {m.session}
            </p>
          </Reveal>
          <Reveal>
            <h2 className="text-2xl">What it is not</h2>
            <p className="measure mt-3 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {m.isNot}
            </p>
            <p className="measure mt-4 rounded-md bg-surface-100/70 p-5 text-sm leading-relaxed text-ink-600 dark:bg-night-900 dark:text-mist-400">
              Healing practices complement — and never replace — care from
              qualified medical or mental-health professionals. If you're in
              crisis, please start with the helplines listed on our{" "}
              <Link href="/trust#crisis" className="underline underline-offset-2">
                trust page
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </Container>

      {practitioners.length > 0 && (
        <Container className="mt-32">
          <Reveal>
            <h2 className="text-2xl">Healers who practise {m.name}</h2>
          </Reveal>
          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {practitioners.map((h) => (
              <li key={h.slug}>
                <HealerCard healer={h} />
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button variant="secondary" asChild>
              <Link href="/healers">See all healers</Link>
            </Button>
          </div>
        </Container>
      )}
    </div>
  );
}
