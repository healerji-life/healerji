"use client";

import { motion, useReducedMotion } from "framer-motion";
import SplitText from "@/components/react-bits/SplitText/SplitText";
import { motionFor } from "@/lib/motion/chakra-motion";
import { easeCalm } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A section heading that carries the current centre's rhythm.
 *
 * Headings get moderate animation — never the hero's — and the body
 * beneath them arrives with a single quiet fade, because if everything
 * moves, nothing feels considered.
 */
export function ChakraHeading({
  text,
  chakraSlug,
  id,
  className,
}: {
  text: string;
  chakraSlug: string;
  id?: string;
  className?: string;
}) {
  const m = motionFor(chakraSlug);
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <h2 id={id} className={cn("text-2xl", className)}>
        {text}
      </h2>
    );
  }

  return (
    <SplitText
      tag="h2"
      text={text}
      splitType="words"
      delay={m.splitDelay + 20}
      duration={Math.min(m.splitDuration, 0.9)}
      ease={m.ease}
      from={{ opacity: 0, y: 18 }}
      to={{ opacity: 1, y: 0 }}
      threshold={0.2}
      rootMargin="-60px"
      textAlign="left"
      className={cn("!text-2xl", className)}
    />
  );
}

/** A quiet arrival for the content beneath a heading. */
export function SectionBody({
  children,
  className,
  delay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: easeCalm, delay }}
    >
      {children}
    </motion.div>
  );
}
