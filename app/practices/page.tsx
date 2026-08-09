import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { listPublishedPractices } from "@/lib/services/practices";
import { toPractices } from "@/lib/services/practice-adapter";

export const metadata: Metadata = {
  title: "Guided practices",
  description:
    "Paced, step-by-step practices you can do right now — breath work, grounding, forgiveness and heart-centre rest. Free, and they remember where you stopped.",
};



/**
 * DATABASE-BACKED as of pass 6.
 *
 * Reads published_practices, which is time-aware, so a scheduled practice
 * appears on its date and unpublishing removes it. Categories are derived from
 * the data rather than a module constant, so a new category needs no code change.
 */
export const revalidate = 300;

export default async function PracticesPage() {
  const result = await listPublishedPractices();
  const practices = result.ok ? toPractices(result.data) : [];
  const CATEGORIES = Array.from(new Set(practices.map((p) => p.category)));

  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="max-w-2xl">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            Guided practices
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl">Something to do, not just read.</h1>
          <p className="mt-5 text-lg text-ink-600 dark:text-mist-400">
            Each practice is paced step by step, the way a healer would hold
            it. Pause whenever you like — it remembers where you stopped, and
            it&rsquo;s free.
          </p>
          <p className="mt-4 text-[0.9375rem] text-mist-500">
            {CATEGORIES.join(" · ")}
          </p>
        </header>

        <ul className="mt-20 grid gap-5 md:grid-cols-2">
          {practices.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={(i % 2) * 0.05}>
              <SpotlightCard className="h-full rounded-md">
                <Link
                  href={`/practices/${p.slug}`}
                  className="flex h-full flex-col rounded-md bg-surface-0 p-7 shadow-e-1 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2 dark:bg-night-900"
                >
                  <p className="text-[0.8125rem] uppercase tracking-[0.14em] text-mist-500">
                    {p.category} · {p.minutes} min · {p.steps.length} steps
                  </p>
                  <h2 className="mt-3 font-display text-xl">{p.title}</h2>
                  <p className="mt-3 flex-1 text-ink-600 dark:text-mist-400">{p.standfirst}</p>
                </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </ul>

        <p className="mt-16 max-w-[60ch] text-[0.9375rem] text-mist-500">
          Recorded audio guidance for these practices, and offline listening,
          arrive with the HealerJi app — the written pacing here works
          everywhere in the meantime.
        </p>
      </Container>
    </div>
  );
}
