import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { Reveal } from "@/components/reveal";
import { modalities } from "@/lib/data/modalities";

export const metadata: Metadata = {
  title: "Healing modalities — explained honestly",
  description:
    "Reiki, chakra healing, Swar Vigyan, inner-child work and more — what each practice is, what a session feels like, and what it is not.",
};

export default function HealingIndex() {
  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="mb-14 max-w-2xl">
          <h1 className="text-4xl md:text-5xl">The healing library.</h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-mist-400">
            Thirteen practices, each explained the same honest way: what it is,
            what a session feels like, and — because trust matters more to us
            than mystique — what it is not.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modalities.map((m, i) => (
            <Reveal as="li" key={m.slug} delay={(i % 3) * 0.05}>
              <SpotlightCard className="h-full rounded-md">
                <Link
                  href={`/healing/${m.slug}`}
                  className="flex h-full flex-col rounded-md bg-surface-0 p-6 shadow-e-1 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2 dark:bg-night-900"
                >
                  <h2 className="font-display text-xl">{m.name}</h2>
                  <p className="mt-2 text-ink-600 dark:text-mist-400">{m.essence}</p>
                </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </ul>
      </Container>
    </div>
  );
}
