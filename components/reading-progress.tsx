"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Article reading progress — a plum thread under the header. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-16 z-40 h-[2px] origin-left bg-ink-900/25 dark:bg-surface-0/25"
    />
  );
}
