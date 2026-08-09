"use client";

import type { Variants } from "framer-motion";

/** One Breath: the platform's shared calm tempo (seconds). */
export const BREATH = 10;

export const easeCalm = [0.22, 1, 0.36, 1] as const;

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeCalm } },
};

export const stagger = (delay = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

export const crossfade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

/**
 * The HealerJi motion language — one set of rules every interaction obeys,
 * so nothing on the site feels borrowed from somewhere else.
 *
 * Durations   micro 0.2s · standard 0.45s · narrative 0.7–0.9s · ambient 10s+
 * Easing      easeCalm [0.22, 1, 0.36, 1] for everything that arrives;
 *             "easeInOut" only for looping breath cycles
 * Stagger     0.045s inside a sentence (SplitText) · 0.05s across a grid
 * Arrival     fade + ≤12px rise + blur clearing. Never a slide, never a zoom
 * Hover       lift ≤2px, shadow e-1 → e-2, 0.3s; light follows the pointer
 * Press       scale 0.98
 * Depth       shadow-e-1 resting, shadow-e-2 raised, blur 110–130px ambient
 * Reduced     every effect below collapses to a still, complete composition
 */
export const MOTION = {
  micro: 0.2,
  standard: 0.45,
  narrative: 0.8,
  breath: BREATH,
  staggerWord: 0.045,
  staggerGrid: 0.05,
  rise: 12,
} as const;
