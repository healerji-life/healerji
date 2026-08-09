"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { founder } from "@/lib/data/founder";
import { TiltedCard } from "@/components/motion/tilted-card";
import { SplitText } from "@/components/motion/split-text";
import { BlurText } from "@/components/motion/blur-text";

/**
 * Founder-led opening: asymmetric editorial composition — her portrait
 * rising gently against scroll, the platform's reason-for-being in
 * magazine type beside it. The face of the brand, treated like one.
 */
export function FounderSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 36, reduce ? 0 : -36]);

  return (
    <section
      ref={ref}
      className="overflow-hidden bg-surface-50 py-28 dark:bg-night-900/60 md:py-40"
      aria-label="Founder of HealerJi"
    >
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <motion.figure style={{ y: imgY }} className="relative mx-auto w-full max-w-[440px]">
          <TiltedCard max={4}>
          <Image
            src={founder.portrait}
            alt={`${founder.honorific} ${founder.name}, founder of HealerJi, meditating cross-legged in a garden`}
            width={1400}
            height={1749}
            className="rounded-md object-cover shadow-e-2"
            sizes="(min-width: 1024px) 440px, 90vw"
          />
          </TiltedCard>
          <figcaption className="mt-4 flex items-baseline justify-between px-1">
            <span className="font-display text-lg">{founder.honorific} {founder.name}</span>
            <span className="text-sm text-mist-500">{founder.role}</span>
          </figcaption>
        </motion.figure>

        <div>
          <Reveal>
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
              Whose life's work this is
            </p>
            <SplitText
              as="h2"
              text={'"Healing is not something we do to you — it is something we help you remember you can do."'}
              stagger={0.045}
              className="mt-4 block text-3xl md:text-4xl lg:text-[3rem] lg:leading-[1.1]"
            />
            <BlurText delay={0.2} className="measure mt-6 text-lg text-ink-600 dark:text-mist-400">
              HealerJi was founded by {founder.honorific} {founder.name} — an
              educator of twenty years, and herself a certified Reiki,
              Law-of-Attraction and Ho'oponopono practitioner. She built the
              platform she couldn't find: one trusted home where India's
              certified healers and the people who need them finally meet — a home for{" "}
              <span className="text-ink-900 dark:text-surface-0">healing, held honestly</span>.
            </BlurText>
            <Button variant="secondary" className="mt-8" asChild>
              <Link href="/about">
                Read her story
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
