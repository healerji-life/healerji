"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useState } from "react";
import { BREATH, easeCalm } from "@/lib/motion";

/**
 * The mark, alive in the navigation.
 *
 * At rest it breathes on the shared 10-second cycle with a faint aura.
 * As the page scrolls the lockup contracts to the lotus alone, so the
 * header lightens as you descend and re-opens when you return to the
 * top. Vector throughout; entirely still under prefers-reduced-motion.
 */
export function NavLogo() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 80);
  });

  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="HealerJi — home">
      <span className="relative inline-flex items-center justify-center">
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute -inset-2 rounded-full blur-md"
            style={{ backgroundColor: "rgba(190,58,149,0.16)" }}
            animate={{ scale: [0.85, 1.12, 0.85], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.span
          className="relative"
          animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
          transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/brand/mark.svg"
            alt=""
            width={48}
            height={30}
            priority
            className="dark:hidden"
            style={{ width: 48, height: 30 }}
          />
          <Image
            src="/brand/mark-light.svg"
            alt=""
            width={48}
            height={30}
            priority
            className="hidden dark:block"
            style={{ width: 48, height: 30 }}
          />
        </motion.span>
      </span>

      <motion.span
        className="hidden overflow-hidden sm:block"
        animate={{
          width: scrolled && !reduce ? 0 : 96,
          opacity: scrolled && !reduce ? 0 : 1,
          marginLeft: scrolled && !reduce ? 0 : 2,
        }}
        transition={{ duration: 0.55, ease: easeCalm }}
      >
        <Image
          src="/brand/wordmark.svg"
          alt="HealerJi"
          width={96}
          height={36}
          priority
          className="dark:hidden"
          style={{ width: 96, height: 36 }}
        />
        <Image
          src="/brand/wordmark-light.svg"
          alt=""
          aria-hidden
          width={96}
          height={36}
          className="hidden dark:block"
          style={{ width: 96, height: 36 }}
        />
      </motion.span>
    </Link>
  );
}
