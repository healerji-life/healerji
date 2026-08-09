"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { easeCalm } from "@/lib/motion";
import { AppLinks } from "@/components/app-links";

/**
 * App availability, in the hero — as a fact, not an advertisement.
 *
 * A thin glass rail sits at the foot of the hero: a phone rendered at
 * the actual proportions of the app's home screen, floating on the
 * shared breath, and the two store links set as quiet typographic
 * lockups rather than borrowed badge images. It reads as "this also
 * lives in your pocket", which is what it is.
 */
export function HeroApp() {
  const reduce = useReducedMotion();
  return (
    <motion.aside
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.05, ease: easeCalm }}
      aria-label="HealerJi mobile app"
      className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-5"
    >
      <p className="text-[0.9375rem] text-ink-600 dark:text-mist-400">
        Your practice doesn&rsquo;t have to stay on this page.
      </p>

      <AppLinks />

      <p className="w-full text-[0.8125rem] text-mist-500">
        Prefer the browser?{" "}
        <Link
          href="/book"
          className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30"
        >
          Book a session right here
        </Link>
        .
      </p>
    </motion.aside>
  );
}
