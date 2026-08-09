"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ChakraFigure } from "@/components/chakra-figure";
import { SeedSoundPlayer } from "@/components/chakra/seed-sound-player";
import { Button } from "@/components/ui/button";
import { chakras, type Chakra } from "@/lib/data/chakras";
import { easeCalm } from "@/lib/motion";
import { SplitTextNow } from "@/components/motion/split-text";
import { BlurText } from "@/components/motion/blur-text";

/** Interactive map: tap a centre on the figure, read it beside. */
export function ChakraExplorer() {
  const [active, setActive] = useState<Chakra>(chakras[3]!); // begin at the heart

  return (
    <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
      {/* The interface leans toward the active centre's colour */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]"
        animate={{ backgroundColor: active.color }}
        transition={{ duration: 1.4, ease: easeCalm }}
        style={{ opacity: 0.14 }}
      />
      <div className="mx-auto w-full max-w-[340px]">
        <ChakraFigure active={active} onSelect={setActive} />
      </div>

      <div className="min-h-[380px]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: easeCalm }}
          >
            <p
              className="text-sm font-medium uppercase tracking-[0.18em]"
              style={{ color: active.color }}
            >
              {active.order} of 7 · {active.element}
            </p>
            <h3 className="mt-2 font-display text-3xl">
              <SplitTextNow as="span" text={active.name} stagger={0.09} />
              <span className="ml-3 text-xl text-mist-500">{active.sanskrit}</span>
            </h3>
            <p className="mt-2 text-sm text-mist-500">{active.location}</p>
            <BlurText delay={0.15} className="measure mt-5 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {active.emotional}
            </BlurText>
            <BlurText delay={0.3} className="measure mt-3 text-ink-600 dark:text-mist-400">
              {active.healing}
            </BlurText>
            <SeedSoundPlayer chakra={active} compact className="mt-6" />
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/chakras/${active.slug}`}>
                  Explore the {active.name} chakra
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/healing/chakra-healing">About chakra healing</Link>
              </Button>
            </div>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              <Link href="/healers" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] transition-colors hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30 dark:hover:decoration-surface-0">
                Healers who work here →
              </Link>
              <Link href="/library" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] transition-colors hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30 dark:hover:decoration-surface-0">
                Guided practices →
              </Link>
              <Link href="/events" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] transition-colors hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30 dark:hover:decoration-surface-0">
                Workshops →
              </Link>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
