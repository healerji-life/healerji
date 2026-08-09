import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PracticePlayer } from "@/components/practice-player";
import { getPublishedPractice, listPublishedPracticeSlugs } from "@/lib/services/practices";
import { toPractice } from "@/lib/services/practice-adapter";

export async function generateStaticParams() {
  const slugs = await listPublishedPracticeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await getPublishedPractice(slug);
  const p = found.ok ? toPractice(found.data) : null;
  if (!p) return {};
  return { title: p.title, description: p.standfirst };
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Unpublished or archived is genuinely not found publicly: the view filters
  // it out, so unpublishing in admin removes this page.
  const found = await getPublishedPractice(slug);
  if (!found.ok) notFound();
  const practice = toPractice(found.data);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: practice.title,
    description: practice.standfirst,
    totalTime: `PT${practice.minutes}M`,
    step: practice.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: s.say,
    })),
  };

  return (
    <div className="pb-40 pt-44">
      <Container className="max-w-2xl">
        <p className="text-[0.8125rem] text-mist-500">
          <Link href="/practices" className="underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:decoration-surface-0/30">
            Guided practices
          </Link>
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl">{practice.title}</h1>
        <p className="measure mt-5 text-lg text-ink-600 dark:text-mist-400">{practice.standfirst}</p>

        <div className="mt-12">
          <PracticePlayer practice={practice} />
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <Link href="/practices">Other practices</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/healers">Work with a healer on this</Link>
          </Button>
        </div>
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
