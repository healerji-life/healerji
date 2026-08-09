import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/magnetic";
import { SplitText } from "@/components/motion/split-text";
import { BlurText } from "@/components/motion/blur-text";
import { Aurora } from "@/components/motion/aurora";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden py-36 md:py-56">
      <Aurora intensity={0.4} />
      <Container className="text-center">
        <Reveal>
          <SplitText
            as="h2"
            text="Your first conversation can be today."
            className="mx-auto block max-w-[20ch] text-4xl md:text-5xl"
          />
          <BlurText delay={0.25} className="mx-auto mt-5 max-w-[46ch] text-lg text-ink-600 dark:text-mist-400">
            Joining is free. Browse certified healers, pick a time that suits
            you, and pay only for the session you book.
          </BlurText>
          <div className="mt-10 flex justify-center">
            <Magnetic>
              <Button size="lg" asChild>
                <Link href="/healers">Find your healer</Link>
              </Button>
            </Magnetic>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
