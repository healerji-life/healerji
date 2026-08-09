"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import SpotlightCard from "@/components/react-bits/SpotlightCard/SpotlightCard";
import { buildChakraTheme } from "@/lib/chakra-theme";
import { hexToRgb } from "@/lib/chakra-theme";
import { easeCalm } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Chakra } from "@/lib/data/chakras";

/**
 * What this centre represents — as something to explore rather than a
 * table to read.
 *
 * Each facet shows its headline; opening one reveals the detail
 * beneath it and quiets the others. Works by click on every device, so
 * touch is not a second-class citizen, and each card is a real button
 * with proper keyboard support and expanded state.
 */
export function ChakraFacets({ chakra }: { chakra: Chakra }) {
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const theme = buildChakraTheme(chakra.color);
  const [r, g, b] = hexToRgb(chakra.color);

  const facets = [
    { key: "element", label: "Element", value: chakra.element, detail: chakra.tradition },
    { key: "location", label: "Traditional location", value: chakra.location, detail: chakra.bodyFocus },
    { key: "meaning", label: "Meaning", value: chakra.meaning, detail: chakra.emotional },
    {
      key: "lotus",
      label: "Lotus",
      value: chakra.petals === 1000 ? "A thousand petals" : `${chakra.petals} petals`,
      detail: `Drawn in ${chakra.colorName.toLowerCase()}, with the seed sound ${chakra.bija} (${chakra.bijaDevanagari}) at its centre.`,
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {facets.map((f) => {
        const isOpen = open === f.key;
        return (
          <li key={f.key}>
            <SpotlightCard
              className="h-full rounded-md border"
              spotlightColor={`rgba(${r}, ${g}, ${b}, 0.16)`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : f.key)}
                aria-expanded={isOpen}
                className="w-full rounded-md p-6 text-left outline-none"
                style={{ color: theme.foreground }}
              >
                <span
                  className="text-[0.8125rem] uppercase tracking-[0.14em]"
                  style={{ color: theme.mutedForeground }}
                >
                  {f.label}
                </span>
                <span className="mt-2 block font-display text-xl">{f.value}</span>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.span
                      className="block overflow-hidden"
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: easeCalm }}
                    >
                      <span
                        className="mt-4 block text-[0.9375rem] leading-relaxed"
                        style={{ color: theme.mutedForeground }}
                      >
                        {f.detail}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
                <span
                  className={cn("mt-4 block text-[0.8125rem] transition-opacity", isOpen && "opacity-60")}
                  style={{ color: theme.accent }}
                  aria-hidden
                >
                  {isOpen ? "Close" : "Read more"}
                </span>
              </button>
            </SpotlightCard>
          </li>
        );
      })}
    </ul>
  );
}
