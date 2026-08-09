"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { petalAngles, petalPath, bindus } from "./geometry";
import { BREATH } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface CoronaSpec {
  count: number;
  inner: number;
  outer: number;
  width: number;
  waist?: number;
  opacity?: number;
  /** rotate the whole ring, to interleave coronas */
  offset?: number;
}

/**
 * The shared armature of a yantra: one or more coronas of petals, a
 * pericarp, a bindu border, and layered light.
 *
 * Each symbol supplies its own coronas and its own inner geometry, so
 * the seven read as seven distinct traditional forms rather than one
 * flower with the petal count changed. Every instance owns its
 * gradient ids, spins at its own rate and breathes at its own phase.
 */
export function LotusBase({
  coronas,
  color,
  size = 120,
  spin = 240,
  phase = 0,
  active = false,
  /** the centre's inner geometry */
  children,
  className,
  id,
  pericarp = 26,
  binduCount = 12,
}: {
  coronas: CoronaSpec[];
  color: string;
  size?: number;
  spin?: number;
  phase?: number;
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  id: string;
  pericarp?: number;
  binduCount?: number;
}) {
  const reduce = useReducedMotion();
  const uid = `${id}-${useId().replace(/:/g, "")}`;
  const small = size < 56;

  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      className={cn("overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id={`${uid}-petal`} cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="72%" stopColor={color} stopOpacity="0.10" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </radialGradient>
        <radialGradient id={`${uid}-heart`} cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="40%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.18" />
        </radialGradient>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <motion.circle
        r={active ? 90 : 74}
        fill={`url(#${uid}-halo)`}
        filter={`url(#${uid}-soft)`}
        animate={reduce ? undefined : { scale: [0.92, 1.08, 0.92], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut", delay: phase }}
      />

      <motion.g
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: spin, repeat: Infinity, ease: "linear" }}
      >
        {coronas.map((c, ci) => (
          <g key={ci} opacity={c.opacity ?? 1}>
            {petalAngles(c.count, c.offset ?? 0).map((a, i) => (
              <path
                key={i}
                transform={`rotate(${a})`}
                d={petalPath(c.inner, c.outer, c.width, c.waist)}
                fill={`url(#${uid}-petal)`}
                stroke={color}
                strokeOpacity={active ? 0.8 : 0.58}
                // hairlines vanish at chip sizes; thicken as the symbol shrinks
                strokeWidth={small ? 2.6 : c.count > 24 ? 1 : 1.6}
                strokeLinejoin="round"
              />
            ))}
          </g>
        ))}
      </motion.g>

      {!small && (
        <motion.g
          animate={reduce ? undefined : { rotate: -360 }}
          transition={{ duration: spin * 1.9, repeat: Infinity, ease: "linear" }}
        >
          {bindus(binduCount, pericarp + 5).map((b, i) => (
            <circle key={i} cx={b.cx} cy={b.cy} r={1.4} fill={color} fillOpacity={0.45} />
          ))}
        </motion.g>
      )}

      <circle r={pericarp} fill={`url(#${uid}-heart)`} fillOpacity="0.2" stroke={color} strokeOpacity="0.65" strokeWidth={small ? 2.4 : 1.4} />

      {/* Inner geometry — omitted at chip sizes, where it would only muddy */}
      {!small && <g>{children}</g>}
    </svg>
  );
}
