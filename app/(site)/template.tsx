"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easeCalm } from "@/lib/motion";

/**
 * Route transitions: every page gracefully arrives — fade, a breath of
 * blur clearing, 12px of rise. No slides, no zooms; instant under
 * prefers-reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeCalm }}
    >
      {children}
    </motion.div>
  );
}
