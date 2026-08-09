"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * The Thread — HealerJi's signature graphic device.
 *
 * In the tradition, the sushumna is the central channel: a single line
 * running the length of the body through which energy rises. Here it
 * becomes the spine of the whole page — one continuous hairline that
 * passes through every section, gathering light as you scroll and
 * carrying it upward. Sections don't sit next to each other; they are
 * threaded onto the same line.
 *
 * This is the thing that should make the site recognisable with the
 * logo removed. Not a lotus. Not a mandala. A single considered line.
 */
export function Spine({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 26, restDelta: 0.0005 });
  const lightY = useTransform(progress, [0, 1], ["0%", "100%"]);
  const lightOpacity = useTransform(progress, [0, 0.06, 0.94, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} className="relative">
      {/* The line itself — hairline, centred, behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 lg:block"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(20,20,20,0.07) 6%, rgba(20,20,20,0.07) 94%, transparent)",
        }}
      >
        {/* Light travelling the thread as the reader descends */}
        {!reduce && (
          <motion.span
            className="absolute left-1/2 h-32 w-px -translate-x-1/2 -translate-y-1/2"
            style={{
              top: lightY,
              opacity: lightOpacity,
              background:
                "linear-gradient(to bottom, transparent, rgba(75,14,66,0.5), transparent)",
            }}
          />
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * A node on the thread — a small mark where a section meets the line,
 * the way a chakra sits on the channel. Used sparingly, between
 * sections, to make the spine feel structural rather than decorative.
 */
export function SpineNode({ label }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative hidden h-24 lg:block">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.span
          className="block h-1.5 w-1.5 rounded-full bg-ink-900/25 dark:bg-surface-0/25"
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {label && (
        <p className="absolute left-[calc(50%+1.25rem)] top-1/2 -translate-y-1/2 text-xs uppercase tracking-[0.16em] text-mist-500">
          {label}
        </p>
      )}
    </div>
  );
}
