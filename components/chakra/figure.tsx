"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BREATH } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The meditating figure — ONE continuous silhouette.
 *
 * The whole body is a single compound path: crown, skull, jaw, neck,
 * trapezius, deltoid, arm, hand, knee, the folded legs, and back up
 * the mirrored side. No separate head, no ellipse limbs, no assembled
 * parts — which is what stops it reading as a wireframe.
 *
 * Everything else is restraint: one soft gradient inside the shape,
 * two whisper-weight internal contours to place the crossed shins and
 * the arms, and nothing more. The body stays quiet so the energy
 * centres remain the subject.
 *
 * viewBox 0 0 420 560. Landmarks the overlay anchors to:
 *   crown of the head  y ≈ 58   (sahasrāra sits above, at 42)
 *   brow line          y ≈ 100
 *   throat             y ≈ 178
 *   mid-sternum        y ≈ 236
 *   upper abdomen      y ≈ 296
 *   below the navel    y ≈ 340
 *   pelvic floor       y ≈ 396
 */

/** The entire human figure, as one path. */
const SILHOUETTE = `M 210 58
  C 188 58, 172 76, 170 102
  C 168 124, 175 142, 186 152
  C 186 160, 185 166, 182 172
  C 164 178, 146 188, 132 202
  C 118 216, 108 244, 100 280
  C 94 308, 90 336, 90 362
  C 90 386, 94 404, 100 416
  C 88 420, 74 430, 66 444
  C 56 460, 62 478, 84 488
  C 112 500, 160 506, 210 506
  C 260 506, 308 500, 336 488
  C 358 478, 364 460, 354 444
  C 346 430, 332 420, 320 416
  C 326 404, 330 386, 330 362
  C 330 336, 326 308, 320 280
  C 312 244, 302 216, 288 202
  C 274 188, 256 178, 238 172
  C 235 166, 234 160, 234 152
  C 245 142, 252 124, 250 102
  C 248 76, 232 58, 210 58 Z`;

export function ChakraFigureArt({
  tint = "#BE3A95",
  className,
  breathing = true,
  /** y-position (0–1 of the artboard) the light gathers around */
  focus,
}: {
  tint?: string;
  className?: string;
  breathing?: boolean;
  focus?: number;
}) {
  const reduce = useReducedMotion();
  const animate = breathing && !reduce;
  const u = useId().replace(/:/g, "");
  const ref = (n: string) => `fig-${n}-${u}`;

  return (
    <svg
      viewBox="0 0 420 560"
      className={cn("h-full w-full", className)}
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={ref("fill")} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#4B0E42" stopOpacity="0.14" />
          <stop offset="55%" stopColor="#4B0E42" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#2B0A28" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={ref("aura")}>
          <stop offset="0%" stopColor={tint} stopOpacity="0.20" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        {/* The selected centre warms that part of the body */}
        <radialGradient
          id={ref("focus")}
          cx="50%"
          cy={`${(focus ?? 0.42) * 100}%`}
          r="34%"
        >
          <stop offset="0%" stopColor={tint} stopOpacity="0.42" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <filter id={ref("blur")} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <clipPath id={ref("clip")}>
          <path d={SILHOUETTE} />
        </clipPath>
      </defs>

      {/* Ambient field */}
      <motion.ellipse
        cx="210"
        cy="300"
        rx="160"
        ry="230"
        fill={`url(#${ref("aura")})`}
        filter={`url(#${ref("blur")})`}
        animate={animate ? { scale: [1, 1.04, 1], opacity: [0.8, 1, 0.8] } : undefined}
        transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "210px 300px" }}
      />

      <motion.g
        animate={animate ? { scaleY: [1, 1.004, 1] } : undefined}
        transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "210px 500px" }}
      >
        {/* The figure — one path */}
        <path d={SILHOUETTE} fill={`url(#${ref("fill")})`} />

        {/* The body illuminates where the selected centre sits */}
        <g clipPath={`url(#${ref("clip")})`}>
          <motion.rect
            x="0"
            y="0"
            width="420"
            height="560"
            fill={`url(#${ref("focus")})`}
            animate={animate ? { opacity: [0.7, 1, 0.7] } : undefined}
            transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>

        {/* Two contours, and nothing else */}
        <g stroke="#1B0618" strokeOpacity="0.10" strokeWidth="1.6" fill="none" strokeLinecap="round">
          {/* where the arms rest against the folded legs */}
          <path d="M104 414 C 128 424, 158 430, 186 432" />
          <path d="M316 414 C 292 424, 262 430, 234 432" />
          {/* the crossed shins */}
          <path d="M128 470 C 158 486, 186 492, 210 492 C 234 492, 262 486, 292 470" />
        </g>
      </motion.g>
    </svg>
  );
}

/** Landmarks, in fractions of the artboard height — shared with the overlay. */
export const FIGURE_ANCHORS = {
  sahasrara: 42 / 560,
  ajna: 100 / 560,
  vishuddha: 178 / 560,
  anahata: 236 / 560,
  manipura: 296 / 560,
  svadhisthana: 340 / 560,
  muladhara: 396 / 560,
} as const;
