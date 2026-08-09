"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { concerns } from "@/lib/config/taxonomy";
import { pathways } from "@/lib/data/pathways";
import { easeCalm } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Begin where it hurts.
 *
 * Not a grid of tiles — an index. Each concern is a line you read
 * down, the way you'd scan a contents page, and the one under your
 * attention lifts into focus while the rest recede. The Hindi name
 * sits alongside because for most people here, that's the word the
 * feeling actually has.
 */
const extra = pathways.filter((p) => !concerns.some((c) => c.slug === p.slug));

export function PathsSection() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="py-32 md:py-52" aria-labelledby="paths-heading">
      <Container>
        <div className="max-w-[42ch]">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            Begin where it hurts
          </p>
          <h2 id="paths-heading" className="mt-5 text-3xl md:text-4xl">
            You don&rsquo;t need to know what Reiki means. You only need to know
            what&rsquo;s heavy.
          </h2>
        </div>

        <ul className="mt-16 md:mt-24" onPointerLeave={() => setActive(null)}>
          {concerns.map((p, i) => (
            <li key={p.slug}>
              <Link
                href={`/paths/${p.slug}`}
                onPointerEnter={() => setActive(p.slug)}
                onFocus={() => setActive(p.slug)}
                onBlur={() => setActive(null)}
                className={cn(
                  "group flex flex-col gap-3 border-t border-ink-900/10 py-8 transition-opacity duration-500 dark:border-surface-0/10 md:flex-row md:items-baseline md:gap-10 md:py-10",
                  active && active !== p.slug ? "opacity-40" : "opacity-100"
                )}
              >
                <span className="w-8 shrink-0 text-[0.8125rem] tabular-nums text-mist-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <motion.span
                  className="flex-1 text-2xl md:text-3xl"
                  animate={reduce ? undefined : { x: active === p.slug ? 6 : 0 }}
                  transition={{ duration: 0.6, ease: easeCalm }}
                >
                  {p.name}
                  <span className="ml-4 font-display text-lg text-mist-500">{p.nameHi}</span>
                </motion.span>
                <span className="max-w-[34ch] text-ink-600 dark:text-mist-400 md:text-right">
                  {p.line}
                </span>
              </Link>
            </li>
          ))}
          <li className="border-t border-ink-900/10 dark:border-surface-0/10" />
        </ul>

        <p className="mt-10 text-ink-600 dark:text-mist-400">
          Also:{" "}
          {extra.map((p, i) => (
            <span key={p.slug}>
              <Link
                href={`/paths/${p.slug}`}
                className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] transition-colors hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30"
              >
                {p.name}
              </Link>
              {i < extra.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}
