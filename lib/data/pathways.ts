import { paths } from "@/lib/data/paths";
import type { Path, PathSlug } from "@/types";

export interface Pathway extends Omit<Path, "slug"> {
  slug: string;
  overview: string;
  modalitySlugs: string[];
  faqs: { q: string; a: string }[];
  /** which of the five business concerns this pathway maps to (for healer matching) */
  concern: PathSlug;
}

const faqCommon = {
  q: "Do I need to believe in this for it to help?",
  a: "No. Come as you are — curious, sceptical, tired. Healers on HealerJi meet you where you stand, and every practice is offered as tradition and experience, never as a demand on your beliefs.",
};

const faqMedical = {
  q: "Is this a replacement for a doctor or therapist?",
  a: "Never. Healing practices on HealerJi complement medical and mental-health care. If you're dealing with a diagnosed condition or a crisis, please work with a qualified professional first — our healers will encourage exactly that.",
};

/** The five core concerns as full pathway pages, plus three focused pathways. */
export const pathways: Pathway[] = [
  ...paths.map((p) => ({
    ...p,
    concern: p.slug,
    overview:
      p.slug === "emotional-wellbeing"
        ? "Anxiety that hums under everything. Grief that arrives in waves. The heaviness you can't explain to people who ask if you're fine. This pathway pairs you with healers who hold space for exactly this — through Reiki, inner-child work, breath practice and honest conversation."
        : p.slug === "relationships"
          ? "Breakups, marriages under strain, family knots that tighten every year. Healers on this pathway work with forgiveness practices like Ho'oponopono, inner-child healing, and coaching — not to tell you what to decide, but to help you meet the relationship, and yourself, more clearly."
          : p.slug === "career-purpose"
            ? "Stuck at a crossroads, burnt out, or successful and strangely empty. This pathway combines practical life coaching and NLP with contemplative practices — so the next step comes from clarity, not panic."
            : p.slug === "money-abundance"
              ? "Money carries more emotion than any spreadsheet admits: fear, shame, old family scripts. Healers here work with Law of Attraction coaching and mindset practice to change your relationship with money — the inner one, which is where the outer one begins."
              : "Sleep that doesn't restore. Energy that runs out by noon. This pathway centres the body: breath science (Swar Vigyan), Reiki, chakra balancing and gentle daily practice — always alongside, never instead of, your doctor's care.",
    modalitySlugs:
      p.slug === "emotional-wellbeing"
        ? ["reiki-pranic-healing", "inner-child-healing", "subliminal-healing", "spiritual-healing"]
        : p.slug === "relationships"
          ? ["hooponopono-healing", "inner-child-healing", "nlp", "life-coach"]
          : p.slug === "career-purpose"
            ? ["life-coach", "nlp", "aura-cleansing", "akashic-records-reader"]
            : p.slug === "money-abundance"
              ? ["law-of-attraction", "life-coach", "crystal-healing"]
              : ["swar-vigyan", "reiki-pranic-healing", "chakra-healing", "subliminal-healing"],
    faqs: [
      {
        q: "How do sessions work?",
        a: "Choose a healer, pick a time, and meet over chat, audio or video — in the language you prefer. Joining HealerJi is free; you pay only for the sessions you book.",
      },
      faqCommon,
      faqMedical,
    ],
  })),
  {
    slug: "stress-anxiety",
    name: "Stress & anxiety",
    nameHi: "तनाव और चिंता",
    line: "For the racing mind, the tight chest, the 3 am ceiling-stare.",
    texture: "from-plum-100 via-surface-0 to-surface-100",
    concern: "emotional-wellbeing",
    overview:
      "Stress is the body keeping score of everything you're carrying. This focused pathway teaches your nervous system another way: breath practice from the Swar Vigyan tradition, Reiki sessions built around deep rest, and subliminal audio rituals for the hours when worry is loudest. Gentle, repeatable, yours.",
    modalitySlugs: ["swar-vigyan", "reiki-pranic-healing", "subliminal-healing", "chakra-healing"],
    faqs: [
      {
        q: "I can't switch my mind off. Will I be able to do this?",
        a: "That's exactly who these practices are for. Nothing here requires an empty mind — only a willing few minutes. Healers start smaller than you expect, and build from what actually works for you.",
      },
      faqCommon,
      faqMedical,
    ],
  },
  {
    slug: "energy-healing",
    name: "Energy healing",
    nameHi: "ऊर्जा चिकित्सा",
    line: "Reiki, pranic work, chakra balancing and aura cleansing — the body's subtler side.",
    texture: "from-orchid-100 via-surface-0 to-plum-100",
    concern: "health-vitality",
    overview:
      "Energy healing is the family of practices — Reiki, pranic healing, chakra balancing, aura cleansing — that work with attention, intention and stillness rather than talk. People come for many reasons; most describe the same thing afterwards: the deepest rest they've had in months. Explore the traditions, then meet the practitioners.",
    modalitySlugs: ["reiki-pranic-healing", "chakra-healing", "aura-cleansing", "crystal-healing"],
    faqs: [
      {
        q: "What does an energy session actually feel like?",
        a: "Quiet, mostly. You sit or lie comfortably; your healer guides you into slow breath, then works in silence. People commonly report warmth, heaviness, tingling, or simply profound calm. There's nothing you need to do right.",
      },
      faqCommon,
      faqMedical,
    ],
  },
  {
    slug: "spiritual-growth",
    name: "Spiritual growth",
    nameHi: "आध्यात्मिक विकास",
    line: "For the questions that arrive when everything else is fine.",
    texture: "from-surface-100 via-orchid-100/60 to-plum-100",
    concern: "emotional-wellbeing",
    overview:
      "Sometimes life works and still feels hollow — the tradition calls that the beginning, not a problem. This pathway is for meaning-seekers: spiritual healing sessions, Akashic readings for the contemplatively curious, and the chakra map as a mirror for inner life. No dogma, no demands; just older maps for newer questions.",
    modalitySlugs: ["spiritual-healing", "akashic-records-reader", "chakra-healing", "hooponopono-healing"],
    faqs: [
      {
        q: "I'm not religious. Is this for me?",
        a: "Yes. HealerJi's practices draw on Indian tradition but belong to no single religion. Healers hold space for the questions, not for any required answer.",
      },
      faqCommon,
      faqMedical,
    ],
  },
];

export const pathwayBySlug = (slug: string) => pathways.find((p) => p.slug === slug);
