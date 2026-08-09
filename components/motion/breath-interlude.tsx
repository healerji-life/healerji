"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { BREATH, easeCalm } from "@/lib/motion";

/**
 * The Breath Interlude — a signature moment: mid-scroll, the page
 * itself pauses to breathe. A ring swells and settles on the shared
 * 10-second cycle while the invitation alternates between "Breathe in"
 * and "Let go". Nothing to click, nothing sold — thirty unhurried
 * pixels of what the whole platform is for. Reduced-motion users see
 * a still ring and the full sentence.
 */
export function BreathInterlude() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setPhase((p) => (p === "in" ? "out" : "in")), (BREATH / 2) * 1000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <section
      aria-label="A moment to breathe"
      className="grain relative overflow-hidden bg-night-950 py-32 text-surface-0 md:py-44"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plum-900/50 blur-[110px] animate-breathe-slow" />
      </div>
      <Container className="relative flex flex-col items-center text-center">
        <div className="relative flex h-48 w-48 items-center justify-center md:h-56 md:w-56">
          {/* Swelling ring on the shared breath */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-orchid-300/50"
            animate={reduce ? undefined : { scale: [0.72, 1, 0.72], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
          />
          <span aria-hidden className="absolute inset-6 rounded-full bg-orchid-500/10 blur-md animate-breathe" />
          <p className="relative font-display text-xl text-surface-0/90">
            {reduce ? (
              "Breathe in. Let go."
            ) : (
              <motion.span
                key={phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.6, ease: easeCalm }}
              >
                {phase === "in" ? "Breathe in…" : "Let go."}
              </motion.span>
            )}
          </p>
        </div>
        <p className="mt-10 max-w-[38ch] text-mist-400">
          That's the whole practice, at its smallest. Everything on HealerJi
          begins exactly here.
        </p>
      </Container>
    </section>
  );
}
