/**
 * The motion language of each centre.
 *
 * Every chakra page runs the same components, but the way they move
 * differs — earth is slow and heavy, water flows, fire is quicker, air
 * breathes, ether moves in waves, the brow works in depth, and the
 * crown barely moves at all. These tokens configure the React Bits
 * primitives, so the difference between the seven pages is data rather
 * than seven hand-built layouts.
 */
export type MotionLanguage =
  | "grounded"
  | "fluid"
  | "energetic"
  | "breathing"
  | "wave"
  | "depth"
  | "cosmic";

export interface ChakraMotion {
  language: MotionLanguage;
  /** 0–1 — how much movement the page permits at all */
  intensity: number;
  splitDuration: number;
  splitDelay: number;
  ease: string;
  /** the edge a folded statement unfolds from */
  hinge: "top" | "bottom" | "left" | "right";
  blurDelay: number;
  depth: number;
  tilt: number;
  orbitSpeed: number;
}

export const CHAKRA_MOTION: Record<string, ChakraMotion> = {
  muladhara: {
    language: "grounded",
    intensity: 0.65,
    splitDuration: 1.1,
    splitDelay: 34,
    ease: "power2.out",
    hinge: "bottom", // rises from the ground
    blurDelay: 90,
    depth: 3.0,
    tilt: 4,
    orbitSpeed: 0.14,
  },
  svadhisthana: {
    language: "fluid",
    intensity: 0.8,
    splitDuration: 0.95,
    splitDelay: 42,
    ease: "power1.inOut", // water eases in and out, never snaps
    hinge: "left",
    blurDelay: 70,
    depth: 2.4,
    tilt: 6,
    orbitSpeed: 0.26,
  },
  manipura: {
    language: "energetic",
    intensity: 0.9,
    splitDuration: 0.7,
    splitDelay: 22,
    ease: "power3.out",
    hinge: "top",
    blurDelay: 45,
    depth: 2.6,
    tilt: 7,
    orbitSpeed: 0.4,
  },
  anahata: {
    language: "breathing",
    intensity: 0.55,
    splitDuration: 1.0,
    splitDelay: 46,
    ease: "sine.inOut",
    hinge: "top",
    blurDelay: 85,
    depth: 2.2,
    tilt: 5,
    orbitSpeed: 0.18,
  },
  vishuddha: {
    language: "wave",
    intensity: 0.7,
    splitDuration: 0.85,
    splitDelay: 38,
    ease: "sine.out",
    hinge: "right",
    blurDelay: 60,
    depth: 2.3,
    tilt: 6,
    orbitSpeed: 0.3,
  },
  ajna: {
    language: "depth",
    intensity: 0.5,
    splitDuration: 1.15,
    splitDelay: 50,
    ease: "power2.inOut",
    hinge: "top",
    blurDelay: 100,
    depth: 3.4, // the deepest extrusion — this centre is about depth
    tilt: 8,
    orbitSpeed: 0.16,
  },
  sahasrara: {
    language: "cosmic",
    intensity: 0.35,
    splitDuration: 1.3,
    splitDelay: 60,
    ease: "power1.out",
    hinge: "top",
    blurDelay: 120,
    depth: 2.0,
    tilt: 3, // barely moves; stillness is the point
    orbitSpeed: 0.08,
  },
};

export const motionFor = (slug: string): ChakraMotion =>
  CHAKRA_MOTION[slug] ?? CHAKRA_MOTION.anahata!;

/** The three conceptual words each centre unfolds in its editorial moment. */
export const CHAKRA_CONCEPTS: Record<string, string[]> = {
  muladhara: ["GROUND", "BELONG", "STAY"],
  svadhisthana: ["FLOW", "FEEL", "CREATE"],
  manipura: ["POWER", "CHOOSE", "ACT"],
  anahata: ["LOVE", "GRIEVE", "OPEN"],
  vishuddha: ["SPEAK", "SOUND", "TRUE"],
  ajna: ["SEE", "KNOW", "TRUST"],
  sahasrara: ["STILL", "VAST", "HOME"],
};

export const conceptsFor = (slug: string): string[] =>
  CHAKRA_CONCEPTS[slug] ?? CHAKRA_CONCEPTS.anahata!;
