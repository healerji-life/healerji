"use client";

import Link from "next/link";
import { useCallback } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { IndianRupee, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/magnetic";
import { HeroApp } from "@/components/home/hero-app";
import { AppShowcase } from "@/components/home/app-showcase";
import { BrandGradient } from "@/components/motion/brand-gradient";
import { chakras } from "@/lib/data/chakras";
import { BREATH, easeCalm } from "@/lib/motion";
import { SplitTextNow } from "@/components/motion/split-text";


/**
 * Cinematic opening: layered plum-and-orchid light breathing on the
 * shared cycle, a lantern that follows the cursor, seven faint chakra
 * motes rising through the field, and the headline arriving word by
 * word. All of it collapses to a still, instant composition under
 * prefers-reduced-motion.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const lightY = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 240]);

  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const lx = useSpring(mx, { stiffness: 40, damping: 20 });
  const ly = useSpring(my, { stiffness: 40, damping: 20 });

  // The mote field leans a few pixels away from the cursor — the air noticing you
  const moteX = useTransform(lx, (v) => (v + 300 - (typeof window !== "undefined" ? window.innerWidth / 2 : 0)) * -0.012);
  const moteY = useTransform(ly, (v) => (v + 300 - (typeof window !== "undefined" ? window.innerHeight / 2 : 0)) * -0.012);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (reduce || e.pointerType !== "mouse") return;
      mx.set(e.clientX - 300);
      my.set(e.clientY - 300);
    },
    [mx, my, reduce]
  );

  return (
    <section
      onPointerMove={onMove}
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Layered ambient light, parallax at 0.3x */}
      <motion.div aria-hidden className="absolute inset-0 -z-10" style={{ y: lightY }}>
        <div className="absolute left-[8%] top-[6%] h-[54vmax] w-[54vmax] rounded-full bg-plum-100/55 blur-[140px] animate-breathe-slow" />
        <div className="absolute right-[-4%] top-[34%] h-[38vmax] w-[38vmax] rounded-full bg-plum-50 blur-[140px] animate-drift" />
      </motion.div>

      {/* Cursor lantern */}
      {!reduce && (
        <motion.div
          aria-hidden
          style={{ x: lx, y: ly }}
          className="pointer-events-none absolute -z-10 hidden h-[600px] w-[600px] rounded-full lg:block"
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(190,58,149,0.10),transparent_65%)]" />
        </motion.div>
      )}

      {/* Seven chakra motes rising through the field, drifting from the cursor */}
      {!reduce && (
        <motion.div aria-hidden className="absolute inset-0 -z-10" style={{ x: moteX, y: moteY }}>
          {chakras.map((c, i) => (
          <motion.span
            key={c.slug}
            aria-hidden
            className="absolute -z-10 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: c.color, left: `${10 + i * 12}%` }}
            initial={{ bottom: "-2%", opacity: 0 }}
            animate={{ bottom: "104%", opacity: [0, 0.5, 0.5, 0] }}
            transition={{
              duration: BREATH * 3,
              repeat: Infinity,
              delay: i * (BREATH / 2.2),
              ease: "linear",
            }}
          />
          ))}
        </motion.div>
      )}

      <div className="mx-auto grid w-full max-w-6xl gap-16 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
        <div>
        <h1 className="max-w-[14ch] text-5xl md:text-6xl lg:text-7xl">
          <SplitTextNow as="span" text="A certified" stagger={0.075} />{" "}
          <BrandGradient>healer,</BrandGradient>{" "}
          <SplitTextNow
            as="span"
            text="one call away."
            delay={0.26}
            stagger={0.075}
            className="text-ink-600 dark:text-mist-400"
          />
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: easeCalm }}
          className="measure mt-6 text-lg text-ink-600 md:text-xl dark:text-mist-400"
        >
          HealerJi connects you with certified healers — Reiki, chakra
          work, breath practice, life coaching and more — over chat, audio or
          video, in the language you think in. For whatever feels heavy:
          health, relationships, career, money, or emotions.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: easeCalm }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Magnetic>
            <Button size="lg" asChild>
              <Link href="/healers">Find your healer</Link>
            </Button>
          </Magnetic>
          <Magnetic>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/chakras">Explore the chakra map</Link>
            </Button>
          </Magnetic>
        </motion.div>

        <motion.ul
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-600 dark:text-mist-400"
        >
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-mist-500" aria-hidden />
            <Link href="/trust" className="hover:underline underline-offset-4">
              Certified healers, vetted before they meet you
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-mist-500" aria-hidden />
            <span>Free to join · pay only for sessions</span>
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-mist-500" aria-hidden />
            <Link href="/trust#privacy" className="hover:underline underline-offset-4">
              Your conversations stay private
            </Link>
          </li>
        </motion.ul>

          <HeroApp />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.75, ease: easeCalm }}
        >
          <AppShowcase />
        </motion.div>
      </div>
    </section>
  );
}
