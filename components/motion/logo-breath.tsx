"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { BREATH } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The mark, breathing.
 *
 * The official logo artwork on the shared 10-second cycle: an aura
 * expands and settles behind it while the mark itself swells by 3%.
 * No spinning, no drawing-on, no gimmick — the same breath the whole
 * site keeps. Used on the loading screen and the splash transition.
 */
export function LogoBreath({
  size = 96,
  className,
  onDark = false,
}: {
  size?: number;
  className?: string;
  onDark?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Aura */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ backgroundColor: onDark ? "rgba(190,58,149,0.35)" : "rgba(75,14,66,0.16)" }}
        animate={reduce ? undefined : { scale: [0.85, 1.35, 0.85], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Expanding ring, one per breath */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: onDark ? "rgba(190,58,149,0.4)" : "rgba(75,14,66,0.25)" }}
          animate={{ scale: [0.9, 1.5], opacity: [0.55, 0] }}
          transition={{ duration: BREATH, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.span
        className="relative"
        animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
        transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src={onDark ? "/brand/mark-light.svg" : "/brand/mark.svg"}
          alt=""
          width={size}
          height={Math.round((size * 603) / 960)}
          priority
          style={{ width: size, height: Math.round((size * 603) / 960) }}
        />
      </motion.span>
    </span>
  );
}
