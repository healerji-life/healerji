import Link from "next/link";
import { Container } from "@/components/ui/container";
import GradualBlur from "@/components/react-bits/GradualBlur/GradualBlur";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { ChakraFigure } from "@/components/chakra-figure";
import { chakras } from "@/lib/data/chakras";

/** The signature: HealerJi's own subject matter as its hero visual. */
export function ChakraSection() {
  return (
    <section
      className="overflow-hidden bg-night-950 py-28 text-surface-0 md:py-40"
      aria-labelledby="chakra-heading"
    >
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <Reveal className="mx-auto w-full max-w-[320px] lg:order-2">
          <ChakraFigure active={chakras[3]} />
        </Reveal>
        <div className="lg:order-1">
          <SectionHeading
            id="chakra-heading"
            eyebrow="The chakra map"
            title="Seven energy centres. One spine of light."
            lede="The oldest map of inner life we have — drawn along the spine, from ground to crown. Explore each centre, what the tradition says it holds, and the healing practices that work with it."
            className="mb-8 [&_h2]:text-surface-0 [&_p:last-child]:text-mist-400"
          />
          <ul className="flex flex-wrap gap-2" aria-label="The seven chakras">
            {chakras.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/chakras/${c.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-0/5 px-4 py-2 text-sm text-surface-0/90 ring-1 ring-surface-0/10 transition-colors hover:bg-surface-0/10"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <Button variant="accent" className="mt-8" asChild>
            <Link href="/chakras">Open the interactive map</Link>
          </Button>
        </div>
      </Container>
      <GradualBlur
        target="parent"
        position="bottom"
        height="6rem"
        strength={1.6}
        divCount={5}
        curve="bezier"
        opacity={0.9}
      />
    </section>
  );
}
