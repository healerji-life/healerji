"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LogoBreath } from "@/components/motion/logo-breath";
import { SplitTextNow } from "@/components/motion/split-text";
import { BREATH, easeCalm } from "@/lib/motion";

/**
 * The breathing threshold: ambient particles, the lotus mark on its
 * shared breath, one line arriving word by word, then the name. It
 * lasts exactly as long as the route needs — never artificially.
 */
export default function Loading() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      aria-label="HealerJi is loading"
      className="grain fixed inset-0 z-50 flex items-center justify-center bg-night-950"
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: easeCalm }}
    >
      {!reduce && (
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plum-900/40 blur-[120px] animate-breathe-slow" />
          {[12, 28, 46, 63, 81, 90].map((left, i) => (
            <motion.span
              key={left}
              className="absolute h-1 w-1 rounded-full bg-orchid-300/50"
              style={{ left: `${left}%` }}
              initial={{ top: "104%", opacity: 0 }}
              animate={{ top: "-4%", opacity: [0, 0.7, 0] }}
              transition={{ duration: BREATH * 1.4, repeat: Infinity, delay: i * 1.3, ease: "linear" }}
            />
          ))}
        </div>
      )}
      <div className="relative px-6 text-center">
        <div className="mx-auto w-fit">
          <LogoBreath size={88} onDark />
        </div>
        <SplitTextNow
          as="p"
          text="Every healing journey begins with a single breath."
          className="mx-auto mt-8 max-w-[26ch] font-display text-xl text-surface-0/85 md:text-2xl"
          delay={0.3}
          stagger={0.09}
        />
        <motion.p
          className="mt-7 font-display text-2xl text-surface-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 1.4, duration: 0.8, ease: easeCalm }}
        >
          HealerJi
        </motion.p>
      </div>
    </motion.div>
  );
}
