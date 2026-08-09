"use client";

import { ChakraLotusFor } from "@/components/chakra/lotus";
import { cn } from "@/lib/utils";

/**
 * Editorial cover art, drawn rather than borrowed.
 *
 * Stock photography of serene women on beaches is the visual cliché
 * this brand is trying to escape, so each article gets original art
 * instead: a field of brand light, a lotus drawn at the petal count of
 * the centre the piece relates to, and a horizon rule. Deterministic
 * from the article's own slug, so the same piece always looks the
 * same, and vector, so it costs nothing to load.
 *
 * If commissioned photography arrives, pass `image` and it takes over
 * the same slot at the same aspect ratio.
 */
const PALETTES = [
  { from: "#F6EEF4", to: "#E7D6E4", lotus: "#4B0E42", slug: "anahata" },
  { from: "#F3EFF6", to: "#DCD3E6", lotus: "#3B4CA8", slug: "vishuddha" },
  { from: "#FBF1F0", to: "#EEDBD8", lotus: "#A62C2B", slug: "muladhara" },
  { from: "#F7F1EA", to: "#EADFCF", lotus: "#D9A520", slug: "manipura" },
  { from: "#EDF4EF", to: "#D6E7DC", lotus: "#1F7A4D", slug: "anahata" },
  { from: "#F9EEF6", to: "#EBD5E7", lotus: "#BE3A95", slug: "svadhisthana" },
];

function pick(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length]!;
}

export function ArticleCover({
  slug,
  className,
  ratio = "aspect-[16/10]",
  lotusSize = 96,
}: {
  slug: string;
  className?: string;
  ratio?: string;
  lotusSize?: number;
}) {
  const p = pick(slug);
  return (
    <div
      aria-hidden
      className={cn("relative w-full overflow-hidden rounded-md", ratio, className)}
      style={{ background: `linear-gradient(145deg, ${p.from}, ${p.to})` }}
    >
      {/* Horizon */}
      <span
        className="absolute inset-x-[12%] top-[62%] h-px"
        style={{ background: `linear-gradient(to right, transparent, ${p.lotus}22 20%, ${p.lotus}22 80%, transparent)` }}
      />
      {/* Light */}
      <span
        className="absolute left-1/2 top-[46%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: `${p.lotus}14` }}
      />
      <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-700 ease-calm group-hover:scale-[1.06]">
        <ChakraLotusFor slug={p.slug} color={p.lotus} size={lotusSize} />
      </span>
    </div>
  );
}
