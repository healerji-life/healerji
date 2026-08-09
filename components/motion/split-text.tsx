"use client";

import { useReducedMotion } from "framer-motion";
import RBSplitText from "@/components/react-bits/SplitText/SplitText";
import { cn } from "@/lib/utils";

/**
 * HealerJi's SplitText — the React Bits primitive, configured once.
 *
 * The library component does the splitting and the GSAP work; this
 * fixes the arrival to the HealerJi motion language (0.5–0.9s, soft
 * easing, small vertical travel, gentle stagger) so no call site has
 * to re-decide it, and returns plain text under reduced motion.
 */
export function SplitText({
  text,
  as = "span",
  className,
  delay = 0,
  stagger = 0.055,
  once = true,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  void once;

  if (reduce) return <Tag className={className}>{text}</Tag>;

  return (
    <RBSplitText
      tag={as === "span" ? "p" : as}
      text={text}
      splitType="words"
      delay={Math.round(stagger * 1000)}
      duration={0.8}
      ease="power3.out"
      from={{ opacity: 0, y: 24 }}
      to={{ opacity: 1, y: 0 }}
      threshold={0.2}
      rootMargin="-60px"
      textAlign="left"
      className={cn(className)}
    />
  );
}

/** The same, for text that should arrive on mount rather than on scroll. */
export function SplitTextNow({
  text,
  as = "span",
  className,
  delay = 0,
  stagger = 0.055,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const Tag = as;

  if (reduce) return <Tag className={className}>{text}</Tag>;

  return (
    <RBSplitText
      tag={as === "span" ? "p" : as}
      text={text}
      splitType="chars"
      delay={Math.round(stagger * 1000)}
      duration={0.85}
      ease="power3.out"
      from={{ opacity: 0, y: 30 }}
      to={{ opacity: 1, y: 0, delay }}
      threshold={0.01}
      rootMargin="0px"
      textAlign="left"
      className={cn(className)}
    />
  );
}
