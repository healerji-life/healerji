import type { Path } from "@/types";

/**
 * The five Paths — HealerJi's primary taxonomy.
 * Users arrive with a feeling, not a modality name.
 */
export const paths: Path[] = [
  {
    slug: "health-vitality",
    name: "Health & vitality",
    nameHi: "स्वास्थ्य",
    line: "For deeper rest, steadier energy, and befriending your body.",
    texture: "from-plum-100 via-surface-50 to-orchid-300/30",
  },
  {
    slug: "relationships",
    name: "Relationships",
    nameHi: "रिश्ते",
    line: "For heartbreak, conflict, and finding your way back to each other.",
    texture: "from-surface-100 via-surface-0 to-plum-100",
  },
  {
    slug: "career-purpose",
    name: "Career & purpose",
    nameHi: "करियर और उद्देश्य",
    line: "For crossroads, burnout, and work that finally means something.",
    texture: "from-surface-50 via-surface-100 to-mist-400/20",
  },
  {
    slug: "money-abundance",
    name: "Money & abundance",
    nameHi: "धन और समृद्धि",
    line: "For scarcity fear, and a calmer relationship with money.",
    texture: "from-surface-200/60 via-surface-0 to-orchid-400/20",
  },
  {
    slug: "emotional-wellbeing",
    name: "Emotional wellbeing",
    nameHi: "मन की शांति",
    line: "For anxiety, grief, and the weight you can't quite name.",
    texture: "from-plum-100 via-surface-0 to-surface-100",
  },
];

export const pathBySlug = (slug: string) => paths.find((p) => p.slug === slug);
