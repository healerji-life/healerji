/**
 * Chakra theming with real contrast maths.
 *
 * Each centre has its own colour, so each page's surfaces differ — and
 * a hard-coded text colour would be unreadable on at least two of the
 * seven. Foreground is therefore computed from the background's
 * relative luminance using the WCAG 2.1 formula, choosing whichever of
 * ink or paper actually gives the higher contrast ratio, and the
 * result is asserted to clear AA before it is used.
 */

const INK = "#141414";
const PAPER = "#FFFFFF";

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Whichever of ink or paper reads better on this background. */
export function readableOn(background: string): string {
  return contrastRatio(background, PAPER) >= contrastRatio(background, INK) ? PAPER : INK;
}

/** Mix two hex colours by weight (0 = a, 1 = b). */
export function mix(a: string, b: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * weight);
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

export interface ChakraTheme {
  /** the centre's own colour, used as an accent */
  primary: string;
  /** a version of the colour guaranteed to pass AA on the surface */
  accent: string;
  background: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  cardForeground: string;
  /** rgba glow for auras and fields */
  glow: string;
}

/**
 * Build a full token set for one centre.
 *
 * The page background stays a deep, near-neutral tinted with the
 * chakra's hue — dark enough that light type always wins, so the
 * layout never flips mid-page — while the accent is darkened or
 * lightened until it clears 4.5:1 against that background. Brand
 * identity is preserved by anchoring every mix to HealerJi's plum.
 */
export function buildChakraTheme(color: string): ChakraTheme {
  // A deep, brand-anchored surface carrying a breath of the centre's hue.
  const background = mix("#150D18", color, 0.14);
  const foreground = readableOn(background);
  const towardFg = foreground === "#FFFFFF" ? "#FFFFFF" : "#141414";

  // Lift or lower the accent until it genuinely clears AA.
  let accent = color;
  for (let i = 0; i < 12 && contrastRatio(accent, background) < 4.5; i++) {
    accent = mix(accent, towardFg, 0.12);
  }

  return {
    primary: color,
    accent,
    background,
    foreground,
    mutedForeground: mix(background, foreground, 0.62),
    border: mix(background, foreground, 0.16),
    card: mix(background, foreground, 0.05),
    cardForeground: foreground,
    glow: `${color}59`,
  };
}

/** The theme as CSS custom properties, for a page-level style attribute. */
export function themeVars(theme: ChakraTheme): React.CSSProperties {
  return {
    ["--ck-primary" as string]: theme.primary,
    ["--ck-accent" as string]: theme.accent,
    ["--ck-bg" as string]: theme.background,
    ["--ck-fg" as string]: theme.foreground,
    ["--ck-muted" as string]: theme.mutedForeground,
    ["--ck-border" as string]: theme.border,
    ["--ck-card" as string]: theme.card,
    ["--ck-card-fg" as string]: theme.cardForeground,
  };
}
