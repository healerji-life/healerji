"use client";

import { useReducedMotion } from "framer-motion";
import RBBlurText from "@/components/react-bits/BlurText/BlurText";
import { cn } from "@/lib/utils";

/**
 * HealerJi's BlurText — the React Bits primitive, tuned once.
 *
 * Supporting copy clears into focus rather than sliding in. The
 * library expects a plain string, so call sites that pass elements
 * fall back to a still paragraph rather than breaking.
 */
export function BlurText({
  children,
  className,
  delay = 0,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "p" | "div" | "blockquote" | "span";
}) {
  const reduce = useReducedMotion();

  if (reduce || typeof children !== "string") {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <RBBlurText
      text={children}
      animateBy="words"
      direction="top"
      delay={70 + delay * 1000}
      stepDuration={0.36}
      threshold={0.15}
      className={cn(className)}
    />
  );
}
