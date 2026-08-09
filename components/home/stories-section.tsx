"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { testimonials } from "@/lib/data/testimonials";
import { pathBySlug } from "@/lib/data/paths";
import { easeCalm } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Stories, given room to be heard.
 *
 * A grid of quote cards turns people into tiles. Here one voice holds
 * the page at a time, set large, in the language it was spoken in —
 * changing on its own unhurried rhythm, with the others waiting as
 * quiet marks below. Reading one person properly builds more trust
 * than skimming four.
 *
 * Verified stories only; where someone chose privacy we say so rather
 * than invent a face.
 */
export function StoriesSection() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[i]!;

  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % testimonials.length), 11000);
    return () => clearInterval(id);
  }, [reduce, paused]);

  return (
    <section
      aria-labelledby="stories-heading"
      className="py-32 md:py-52"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <Container className="max-w-4xl">
        <h2 id="stories-heading" className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
          In their own words
        </h2>

        <div className="relative mt-12 min-h-[16rem] md:min-h-[15rem]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={i}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.8, ease: easeCalm }}
            >
              <blockquote className="font-display text-2xl leading-[1.4] text-ink-900 dark:text-surface-0 md:text-3xl">
                {t.quote}
              </blockquote>
              <figcaption className="mt-8 text-[0.9375rem] text-mist-500">
                {t.anonymous ? "Name withheld, by request" : t.name}
                <span className="mx-2" aria-hidden>·</span>
                {pathBySlug(t.path)?.name}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        {/* The other voices, waiting */}
        <div className="mt-10 flex gap-2" role="tablist" aria-label="Choose a story">
          {testimonials.map((s, n) => (
            <button
              key={n}
              role="tab"
              aria-selected={n === i}
              aria-label={`Story ${n + 1} of ${testimonials.length}${s.anonymous ? "" : `, from ${s.name}`}`}
              onClick={() => setI(n)}
              className="group py-3"
            >
              <span
                className={cn(
                  "block h-px w-12 transition-colors duration-500",
                  n === i ? "bg-ink-900 dark:bg-surface-0" : "bg-ink-900/15 group-hover:bg-ink-900/40 dark:bg-surface-0/20"
                )}
              />
            </button>
          ))}
        </div>
      </Container>
    </section>
  );
}
