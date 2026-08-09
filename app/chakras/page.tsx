import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { FounderNote } from "@/components/founder-note";
import { ChakraExplorer } from "@/components/chakra-explorer";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "The seven chakras — an interactive map",
  description:
    "Explore the seven chakras of Indian tradition on an interactive body map: location, element, emotional significance, and the healing practices HealerJi offers for each.",
};

export default function ChakrasPage() {
  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="mb-16 max-w-2xl">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            The chakra map
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl">
            Seven energy centres. One spine of light.
          </h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-mist-400">
            In the Indian tradition, the chakras are a map of inner life drawn
            along the spine — from ground to crown. Touch a centre on the
            figure to read what the tradition says about it, and how healers
            on HealerJi work with each one. Offered as living tradition and
            self-reflection, never as medical anatomy.
          </p>
        </header>
        <Reveal>
          <ChakraExplorer />
        </Reveal>
        <Reveal className="mt-32">
          <FounderNote>
            &ldquo;The chakras are a mirror, not a diagnosis. Read them the way
            you read a poem about yourself.&rdquo;
          </FounderNote>
        </Reveal>
      </Container>
    </div>
  );
}
