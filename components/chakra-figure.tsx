"use client";

import { motion, useReducedMotion } from "framer-motion";
import { chakras, type Chakra } from "@/lib/data/chakras";
import { ChakraFigureArt, FIGURE_ANCHORS } from "@/components/chakra/figure";
import { ChakraLotusFor } from "@/components/chakra/lotus";
import { BREATH } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The chakra map.
 *
 * The figure is drawn in `chakra/figure.tsx`; this places the seven
 * lotuses on it, runs the suṣumnā, and handles interaction. Anchors
 * are percentages of the 400×560 artboard height, taken from the
 * figure's own landmarks:
 *
 *   Sahasrāra    44 / 560  — just ABOVE the crown of the head
 *   Ājñā         96 / 560  — between the eyebrows
 *   Viśuddha    152 / 560  — centre of the throat
 *   Anāhata     214 / 560  — centre of the chest, at the sternum
 *   Maṇipūra    262 / 560  — upper abdomen, navel to sternum
 *   Svādhiṣṭhāna 302 / 560 — two finger-widths below the navel
 *   Mūlādhāra   352 / 560  — pelvic floor
 */
/** Landmarks come from the figure itself, so the two can never drift. */
const ANCHORS = Object.fromEntries(
  Object.entries(FIGURE_ANCHORS).map(([k, v]) => [k, v * 100])
) as Record<string, number>;

const anchorFor = (slug: string) =>
  (ANCHORS as Record<string, number | undefined>)[slug] ?? FIGURE_ANCHORS.anahata * 100;

export function ChakraFigure({
  active,
  onSelect,
  className,
}: {
  active?: Chakra;
  onSelect?: (c: Chakra) => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ordered = [...chakras].sort((a, b) => anchorFor(a.slug) - anchorFor(b.slug));
  const top = anchorFor("sahasrara");
  const bottom = anchorFor("muladhara");

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[440px]", className)}
      style={{ aspectRatio: "420 / 560" }}
    >
      {/* The figure */}
      <div className="absolute inset-0">
        <ChakraFigureArt
          tint={active?.color ?? "#BE3A95"}
          focus={active ? anchorFor(active.slug) / 100 : undefined}
        />
      </div>

      {/* Suṣumnā — the channel between crown and base */}
      <div
        aria-hidden
        className="absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full"
        style={{
          top: `${top}%`,
          height: `${bottom - top}%`,
          background: `linear-gradient(to top, ${ordered
            .slice()
            .reverse()
            .map((c, i) => `${c.color} ${(i / (ordered.length - 1)) * 100}%`)
            .join(", ")})`,
          opacity: 0.4,
        }}
      />

      {/* Energy rising through the channel */}
      {!reduce && (
        <>
          <motion.span
            aria-hidden
            className="absolute left-1/2 h-14 w-[6px] -translate-x-1/2 rounded-full blur-[6px]"
            style={{ backgroundColor: active?.color ?? "#BE3A95", opacity: 0.6 }}
            initial={{ top: `${bottom}%` }}
            animate={{ top: `${top}%` }}
            transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Particles travelling upward, slightly off-axis */}
          {[-7, 0, 6, -3].map((dx, i) => (
            <motion.span
              key={dx}
              aria-hidden
              className="absolute left-1/2 h-1 w-1 rounded-full"
              style={{
                marginLeft: dx,
                backgroundColor: active?.color ?? "#BE3A95",
              }}
              initial={{ top: `${bottom}%`, opacity: 0 }}
              animate={{ top: `${top}%`, opacity: [0, 0.85, 0.85, 0] }}
              transition={{
                duration: BREATH * 1.4,
                repeat: Infinity,
                delay: i * (BREATH / 3.5),
                ease: "easeInOut",
              }}
            />
          ))}
        </>
      )}

      {/* The seven lotuses */}
      {ordered.map((c) => {
        const isActive = active?.slug === c.slug;
        const dim = Boolean(active) && !isActive;
        const size = isActive ? 108 : 62;
        const style = {
          top: `${anchorFor(c.slug)}%`,
          opacity: dim ? 0.38 : 1,
          transition: "opacity 0.6s cubic-bezier(0.22,1,0.36,1)",
        } as const;

        const art = (
          <motion.span
            className="block"
            animate={reduce ? undefined : { scale: isActive ? [1, 1.05, 1] : 1 }}
            transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChakraLotusFor slug={c.slug} color={c.color} size={size} active={isActive} />
          </motion.span>
        );

        return onSelect ? (
          <button
            key={c.slug}
            type="button"
            onClick={() => onSelect(c)}
            aria-pressed={isActive}
            aria-label={`${c.name} — ${c.sanskrit}, at ${c.location.toLowerCase()}`}
            className="group absolute left-1/2 flex min-h-[64px] min-w-[64px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none transition-transform duration-500 ease-calm hover:scale-[1.06] focus-visible:ring-2 focus-visible:ring-orchid-500"
            style={style}
          >
            {art}
          </button>
        ) : (
          <span
            key={c.slug}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={style}
          >
            {art}
          </span>
        );
      })}
    </div>
  );
}
