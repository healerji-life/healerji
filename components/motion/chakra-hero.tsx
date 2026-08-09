"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SplitText from "@/components/react-bits/SplitText/SplitText";
import BlurText from "@/components/react-bits/BlurText/BlurText";
import DepthText from "@/components/react-bits/DepthText/DepthText";
import { ChakraFigure } from "@/components/chakra-figure";
import { SeedSoundPlayer } from "@/components/chakra/seed-sound-player";
import { motionFor } from "@/lib/motion/chakra-motion";
import { buildChakraTheme } from "@/lib/chakra-theme";
import { BREATH } from "@/lib/motion";
import type { Chakra } from "@/lib/data/chakras";

/**
 * One hero, seven behaviours.
 *
 * The composition is identical across the centres; what changes is the
 * motion language each one is configured with — the earth centre's
 * type settles slowly from below, water eases fluidly from the left,
 * fire arrives quickly, the crown barely moves. Colours come from the
 * chakra theme, so nothing here is hand-tuned per page.
 *
 * Typography hierarchy, deliberately unequal: the name is extruded
 * (DepthText), the Devanāgarī clears into awareness (BlurText), the
 * transliteration splits (SplitText), and the bīja simply breathes.
 * Three different arrivals, so none of them feels like a template.
 */
export function ChakraHero({ chakra }: { chakra: Chakra }) {
  const reduce = useReducedMotion();
  const m = motionFor(chakra.slug);
  const theme = buildChakraTheme(chakra.color);

  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-36 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p
            className="text-[0.8125rem] font-medium uppercase tracking-[0.14em]"
            style={{ color: theme.accent }}
          >
            {chakra.order} of 7 · {chakra.element}
          </p>

          {/* The name, extruded in the centre's own colour */}
          <div className="mt-5">
            <DepthText
              text={chakra.name}
              layers={reduce ? 8 : 26}
              depth={m.depth}
              faceColor={theme.foreground}
              depthColor={chakra.color}
              tilt={m.tilt}
              orbitSpeed={m.orbitSpeed}
              smoothing={0.12}
              perspective={1000}
              shadow={false}
              fontSize="clamp(2.75rem, 8vw, 5rem)"
              fontWeight={500}
              className="!font-display"
            />
          </div>

          {/* Devanāgarī — clears into awareness rather than arriving */}
          <BlurText
            text={chakra.devanagari}
            animateBy="letters"
            direction="bottom"
            delay={m.blurDelay}
            stepDuration={0.4}
            className="mt-4 !block text-3xl"
          />

          {/* Transliteration — splits, in the centre's own rhythm */}
          <SplitText
            tag="p"
            text={chakra.sanskrit}
            splitType="chars"
            delay={m.splitDelay}
            duration={m.splitDuration}
            ease={m.ease}
            from={{ opacity: 0, y: m.language === "grounded" ? 26 : 14 }}
            to={{ opacity: 1, y: 0 }}
            textAlign="left"
            className="mt-1 !text-lg"
          />

          <p className="measure mt-7 text-lg leading-relaxed" style={{ color: theme.mutedForeground }}>
            {chakra.tradition}
          </p>

          <dl className="mt-9 grid max-w-md grid-cols-2 gap-x-8 gap-y-5 text-[0.9375rem]">
            <div>
              <dt style={{ color: theme.mutedForeground }}>Traditional location</dt>
              <dd className="mt-1 font-medium">{chakra.location}</dd>
            </div>
            <div>
              <dt style={{ color: theme.mutedForeground }}>Seed sound</dt>
              <dd className="mt-1 font-medium">
                <span style={{ fontFamily: "var(--font-tiro), serif" }}>{chakra.bijaDevanagari}</span>
                <span className="ml-2">{chakra.bija}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-9 max-w-lg">
            <SeedSoundPlayer chakra={chakra} compact />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[360px]">
          <ChakraFigure active={chakra} />
        </div>
      </div>

      {/* Scroll invitation, breathing at the centre's own intensity */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-8 flex justify-center"
        animate={reduce ? undefined : { y: [0, 8 * m.intensity, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: BREATH / 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="h-5 w-5" style={{ color: theme.mutedForeground }} />
      </motion.div>
      <Link href="#meaning" className="sr-only">
        Skip to what this centre means
      </Link>
    </section>
  );
}
