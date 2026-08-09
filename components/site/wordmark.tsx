import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The brand lockup — always the official vector artwork, never
 * re-typeset.
 *
 * The wordmark is drawn in the logo's own display face, so setting
 * "HealerJi" in a web font would guarantee a mismatch in letterforms
 * and kerning. Every appearance of the brand name therefore renders
 * from /public/brand/*.svg, split from the master logo file:
 *
 *   mark      the lotus alone            (favicons, tight spaces)
 *   wordmark  "HealerJi" alone           (inline in running text)
 *   lockup    lotus over wordmark        (header, footer, loading)
 *   full      lockup + Manifest | Heal | Transform
 *
 * Each has a -light twin in white for dark surfaces; the pair is
 * swapped with CSS so there is no flash on theme change.
 */
type Variant = "mark" | "wordmark" | "lockup" | "full";

const RATIO: Record<Variant, number> = {
  mark: 960 / 603,
  wordmark: 448 / 167,
  lockup: 960 / 787,
  full: 1079 / 987,
};

export function Wordmark({
  variant = "lockup",
  height = 40,
  className,
  priority = false,
  /** force the white artwork (for permanently dark surfaces) */
  onDark = false,
}: {
  variant?: Variant;
  height?: number;
  className?: string;
  priority?: boolean;
  onDark?: boolean;
}) {
  const width = Math.round(height * RATIO[variant]);
  const common = { alt: "HealerJi", width, height, priority, style: { width, height } };

  if (onDark) {
    return <Image {...common} src={`/brand/${variant}-light.svg`} className={className} />;
  }
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image {...common} src={`/brand/${variant}.svg`} className="dark:hidden" />
      <Image {...common} src={`/brand/${variant}-light.svg`} alt="" aria-hidden className="hidden dark:block" />
    </span>
  );
}
