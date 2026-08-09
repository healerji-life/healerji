"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/** A hairline of orchid light tracing reading progress. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: reduce ? 1000 : 120,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-ink-900/30 dark:bg-surface-0/30"
    />
  );
}
