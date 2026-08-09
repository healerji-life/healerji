"use client";

import { useReducedMotion } from "framer-motion";
import FoldText from "@/components/react-bits/FoldText/FoldText";
import GradualBlur from "@/components/react-bits/GradualBlur/GradualBlur";
import { motionFor, conceptsFor } from "@/lib/motion/chakra-motion";
import { buildChakraTheme } from "@/lib/chakra-theme";
import type { Chakra } from "@/lib/data/chakras";

/**
 * The editorial moment: three words, unfolding.
 *
 * Each centre's concepts unfold from a different hinge — the root
 * rises from below, water swings in from the left, ether from the
 * right — so the same component reads differently on every page. The
 * words themselves come from the motion config, not from this file.
 *
 * GradualBlur softens the lower edge so the section dissolves into the
 * next rather than ending on a hard line.
 */
export function ChakraConcepts({ chakra }: { chakra: Chakra }) {
  const reduce = useReducedMotion();
  const m = motionFor(chakra.slug);
  const words = conceptsFor(chakra.slug);
  const theme = buildChakraTheme(chakra.color);

  return (
    <section
      aria-label={`${chakra.name}: ${words.join(", ").toLowerCase()}`}
      className="relative overflow-hidden py-28 md:py-40"
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <ul className="space-y-2 md:space-y-4">
          {words.map((w, i) => (
            <li key={w} className={i % 2 === 1 ? "md:pl-[12%]" : undefined}>
              <FoldText
                text={w}
                splitBy="char"
                hinge={m.hinge}
                trigger={reduce ? "mount" : "scroll"}
                duration={reduce ? 0.2 : 0.55 + i * 0.06}
                stagger={reduce ? 0.01 : 0.035 + (1 - m.intensity) * 0.03}
                ease={m.ease}
                perspective={700}
                creaseShading={reduce ? 0 : 0.35 * m.intensity}
                color={i === 1 ? chakra.color : theme.foreground}
                fontSize="clamp(2.5rem, 11vw, 7rem)"
                fontWeight={500}
                className="!font-display"
              />
            </li>
          ))}
        </ul>
      </div>

      {/* The section dissolves rather than stopping */}
      <GradualBlur
        target="parent"
        position="bottom"
        height="5rem"
        strength={1.4}
        divCount={5}
        curve="bezier"
        opacity={0.9}
        zIndex={2}
      />
    </section>
  );
}
