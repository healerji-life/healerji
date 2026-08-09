"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeRise } from "@/lib/motion";

type Tag = "div" | "section" | "li" | "article";

/** Single, restrained scroll reveal: fade + 8px rise, once. */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  delay?: number;
  as?: Tag;
} & React.HTMLAttributes<HTMLElement>) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M
      {...(rest as Record<string, unknown>)}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeRise}
      transition={{ delay }}
    >
      {children}
    </M>
  );
}
