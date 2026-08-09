import type { Healer } from "@/types";

/**
 * LEGACY SEED DATA — superseded by the database as of pass 2.
 *
 * /healers, /healers/[slug], the homepage section and the sitemap now read
 * Supabase. This file remains only for the pages not yet cut over
 * (chakras, paths, healing cross-links, booking-flow, api/checkout) and as the
 * input to scripts/generate-seed.mjs.
 *
 * `nextAvailableAt` is null throughout: availability is a live fact about a
 * healer's calendar and cannot be meaningfully hard-coded. The old
 * "Today, 6:30 pm" strings were prototype fiction and have been removed rather
 * than carried forward.
 *
 * Delete this file once every consumer above reads the database.
 */
export const healers: Healer[] = [
  {
    slug: "meera-krishnan",
    name: "Meera Krishnan",
    headline: "Reiki Master · 14 years of quiet, careful energy work",
    modalities: ["reiki-pranic-healing", "spiritual-healing"],
    languages: ["English", "Hindi", "Tamil"],
    gender: "female",
    years: 14,
    rating: 4.9,
    reviews: 312,
    pricePaise: 49900,
    nextAvailableAt: null,
    verified: { identity: true, credentials: true, interviewed: true },
    bio: "I came to Reiki after a decade in nursing, looking for what medicine couldn't name. Sessions with me are slow, warm, and unhurried — we begin with your breath and end with your questions.",
    sessionTypes: ["audio", "video"],
  },
  {
    slug: "arjun-mehta",
    name: "Arjun Mehta",
    headline: "Life & career coach for people at a crossroads",
    modalities: ["life-coach", "nlp"],
    languages: ["English", "Hindi"],
    gender: "male",
    years: 9,
    rating: 4.8,
    reviews: 204,
    pricePaise: 59900,
    nextAvailableAt: null,
    verified: { identity: true, credentials: true, interviewed: true },
    bio: "Ex-consultant. I left the ladder to help others decide whether to climb it. I coach with structure, honesty, and one commitment per session — no vague pep talks.",
    sessionTypes: ["chat", "audio", "video"],
  },
  {
    slug: "sana-qureshi",
    name: "Sana Qureshi",
    headline: "Inner-child work, held gently in Hindi and Urdu",
    modalities: ["inner-child-healing", "hooponopono-healing"],
    languages: ["Hindi", "Urdu", "English"],
    gender: "female",
    years: 7,
    rating: 5.0,
    reviews: 158,
    pricePaise: 44900,
    nextAvailableAt: null,
    verified: { identity: true, credentials: false, interviewed: true },
    bio: "बचपन की आवाज़ें कभी पुरानी नहीं होतीं. I hold slow, safe sessions where the younger you finally gets to speak — and be answered with kindness.",
    sessionTypes: ["audio", "video"],
  },
  {
    slug: "devika-rao",
    name: "Devika Rao",
    headline: "Akashic reader & contemplative guide",
    modalities: ["akashic-records-reader", "law-of-attraction"],
    languages: ["English", "Kannada", "Hindi"],
    gender: "female",
    years: 11,
    rating: 4.7,
    reviews: 189,
    pricePaise: 69900,
    nextAvailableAt: null,
    verified: { identity: true, credentials: true, interviewed: true },
    bio: "I read the records the way my teacher taught me: with reverence, and without pretending to know more than I'm shown. Bring questions you actually care about.",
    sessionTypes: ["video"],
  },
  {
    slug: "kabir-anand",
    name: "Kabir Anand",
    headline: "Swar Vigyan & breath — the oldest medicine we have",
    modalities: ["swar-vigyan", "subliminal-healing"],
    languages: ["Hindi", "English", "Marathi"],
    gender: "male",
    years: 18,
    rating: 4.9,
    reviews: 267,
    pricePaise: 39900,
    nextAvailableAt: null,
    verified: { identity: true, credentials: true, interviewed: true },
    bio: "Eighteen years of teaching people to read their own breath. My sessions are 20% talking and 80% breathing. Students say the quiet is the lesson.",
    sessionTypes: ["audio", "video"],
  },
  {
    slug: "ananya-bose",
    name: "Ananya Bose",
    headline: "Crystal & aura ritual work for life's transitions",
    modalities: ["crystal-healing", "aura-cleansing"],
    languages: ["Bengali", "English", "Hindi"],
    gender: "female",
    years: 6,
    rating: 4.8,
    reviews: 121,
    pricePaise: 42900,
    nextAvailableAt: null,
    verified: { identity: true, credentials: false, interviewed: true },
    bio: "People come to me at endings — jobs, cities, marriages. Ritual gives the ending a shape, so the beginning can have one too.",
    sessionTypes: ["chat", "video"],
  },
];

export const healerBySlug = (slug: string) => healers.find((h) => h.slug === slug);
