/**
 * LEGACY SEED DATA — superseded by the database in pass 4.
 *
 * /blog, /library, /library/[slug], /paths/*, /chakras/*, /healy and the sitemap
 * all read Supabase now. Nothing in the application imports the `articles` array
 * below any more; it remains solely as the input to scripts/generate-seed.mjs,
 * which turns it into supabase/seed.sql.
 *
 * Safe to delete once you no longer need to regenerate the seed from source.
 */
export type { Article } from "@/lib/content/article";
import type { Article } from "@/lib/content/article";

export const articles: Article[] = [
  {
    slug: "first-reiki-session-what-to-expect",
    title: "Your first Reiki session: what actually happens",
    kind: "guide",
    category: "Energy healing",
    pathway: "energy-healing",
    minutes: 5,
    published: "2026-02-11",
    author: "The HealerJi Journal",
    standfirst: "The honest, minute-by-minute walkthrough we wish every first-timer had.",
    body: [
      "The most common feeling before a first Reiki session isn't scepticism — it's the fear of doing it wrong. So let's remove that first: there is nothing to do. Reiki asks only that you show up and be comfortable.",
      "Your session begins with a short conversation. Your healer will ask what brings you, how you've been sleeping, where you hold tension. Say as much or as little as you like; this isn't an interview, it's orientation.",
      "Then, stillness. On a video or audio session you'll be guided to sit or lie down, close your eyes, and follow a few slow breaths. Your healer then works quietly — often in near-silence — for twenty to thirty minutes. People describe warmth, heaviness in the limbs, images drifting past, or simply the deepest rest they've had in months. All of these are normal. So is feeling nothing dramatic at all.",
      "Sessions end gently: a few minutes to return, a short reflection, and usually one small practice to take with you. Drink water afterwards, and give yourself an unhurried evening if you can.",
      "One honest note, always: Reiki complements medical and mental-health care — it never replaces it. Come for rest, for support, for stillness. Keep your doctor for your doctoring.",
    ],
  },
  {
    slug: "nine-minute-swar-vigyan-practice",
    title: "A nine-minute Swar Vigyan practice for racing nights",
    kind: "guide",
    category: "Breath",
    pathway: "stress-anxiety",
    minutes: 4,
    published: "2026-03-04",
    author: "The HealerJi Journal",
    standfirst: "The breath-awareness ritual our healers teach most often — written down.",
    body: [
      "Swar Vigyan, the old Indian science of breath, begins with observation rather than control. Tonight, that's all you'll do.",
      "Sit or lie comfortably. Close your right nostril gently with your thumb and breathe through the left for a moment; then switch. Notice which side flows more freely. Don't fix it — just notice. In the tradition, this simple noticing is itself the first medicine.",
      "Now rest both hands and breathe normally. Count each exhale, one to ten, then begin again. When the mind wanders — it will, that's its job — return to one without commentary. Nine minutes of this is enough; a timer with a soft chime helps.",
      "The practice works not by emptying the mind but by giving it one warm, boring task. Racing thoughts rarely stop on command; they quiet when attention has somewhere kinder to live.",
      "If sleeplessness is constant, or worry is interfering with your days, please also speak to a doctor or counsellor. This practice is a companion for hard nights — not a treatment for a condition.",
    ],
  },
  {
    slug: "hooponopono-four-phrases",
    title: "Four phrases that carry a whole tradition",
    kind: "article",
    category: "Forgiveness",
    pathway: "relationships",
    minutes: 6,
    published: "2026-03-26",
    author: "The HealerJi Journal",
    standfirst: "I'm sorry. Please forgive me. Thank you. I love you. Why Ho'oponopono endures.",
    body: [
      "Ho'oponopono — 'to make right' — is a Hawaiian practice of reconciliation that travelled the world on the strength of four short phrases: I'm sorry. Please forgive me. Thank you. I love you.",
      "The practice is deceptively simple: you bring to mind a person, a memory, or a version of yourself, and repeat the phrases slowly — not as performance, but as release. The tradition holds that what we carry unforgiven, we carry everywhere.",
      "A crucial clarification our healers make in every session: this is not about excusing harm done to you. You can release the weight of a wound without declaring it acceptable. Forgiveness here is something you do for your own peace, on your own schedule — including the choice not to, yet.",
      "Many people begin with the hardest recipient of all: themselves. The younger self who chose wrong, the parent-self who lost patience, the version of you from last Tuesday. The phrases don't argue with your inner critic; they simply keep speaking until something softens.",
      "On HealerJi, Ho'oponopono is practised in guided one-to-one sessions, often alongside inner-child work. It pairs well with heartbreak, family knots, and the quiet art of ending a year without carrying it into the next.",
    ],
  },
  {
    slug: "chakras-a-map-not-a-diagnosis",
    title: "The chakras: a map, not a diagnosis",
    kind: "article",
    category: "Chakra wisdom",
    pathway: "spiritual-growth",
    minutes: 7,
    published: "2026-04-15",
    author: "The HealerJi Journal",
    standfirst: "How to hold a 2,000-year-old map of inner life honestly in a modern hand.",
    body: [
      "The chakra system — seven energy centres drawn along the spine, from the root at the pelvic floor to the crown above the head — is one of the oldest maps of inner life we have. Like all good maps, its power depends on knowing what it is for.",
      "It is not anatomy. No scan will find a spinning wheel at your solar plexus, and honest healers say so plainly. What the tradition offers instead is a language: a way of noticing that fear lives low in the body, that grief sits in the chest, that unsaid words gather in the throat. Millennia of practitioners found the map useful precisely because experience keeps agreeing with it.",
      "Read this way, chakra work becomes self-reflection with structure. When a healer works with your heart centre, the real material is love, grief and forgiveness; the green light and lotus petals are the tradition's poetry for it. You can take the poetry literally, symbolically, or simply gratefully — the practice works the same.",
      "Begin anywhere, but the tradition suggests beginning low: ground before you climb. Our interactive chakra map walks all seven energy centres — location, meaning, and the practices that work with each.",
      "And the standing rule of this platform applies here as everywhere: the chakra map complements medical care and never replaces it. It is a mirror for the inner life — keep the stethoscope for the outer one.",
    ],
  },
  {
    slug: "choosing-your-first-healer",
    title: "How to choose your first healer",
    kind: "guide",
    category: "Getting started",
    pathway: "emotional-wellbeing",
    minutes: 5,
    published: "2026-05-02",
    author: "The HealerJi Journal",
    standfirst: "Language first, modality second, and three more rules from inside the panel.",
    body: [
      "Choosing a first healer feels weighty, so here is the quiet truth from inside the platform: the match matters more than the modality, and language matters most of all.",
      "Rule one: heal in your mother tongue if you can. Grief and hope live deeper than second languages. Every HealerJi profile lists languages first for exactly this reason — filter by yours before anything else.",
      "Rule two: let your concern choose the practice. You don't need to know what Ho'oponopono is; you need to know that your chest has been tight since the breakup. Start from the pathway — health, relationships, career, money, emotions — and let it introduce the practices.",
      "Rule three: read the healer's own words. Certifications tell you what someone studied; a bio tells you who they are at minute five of a hard conversation. Trust your read.",
      "Rule four: the first session is a meeting, not a marriage. Book one session, notice how you feel — heard, hurried, held? — and decide from there. Joining HealerJi is free and you pay per session precisely so that trying is cheap and staying is a choice.",
    ],
  },
  {
    slug: "law-of-attraction-without-magical-thinking",
    title: "Law of Attraction, without the magical thinking",
    kind: "article",
    category: "Mindset",
    pathway: "money-abundance",
    minutes: 6,
    published: "2026-05-21",
    author: "The HealerJi Journal",
    standfirst: "What the practice looks like when it's coaching, not wishing.",
    body: [
      "The Law of Attraction has a branding problem: its loudest versions promise parking spots and lottery wins, and its quietest version — the one our coaches actually teach — gets drowned out.",
      "The quiet version goes like this: attention is a resource, and most of us spend it rehearsing failure. The practice is a discipline of redirecting attention — naming precisely what you want, noticing the inner argument against it, and building small daily acts that agree with the goal rather than the fear.",
      "In a coaching session this looks unglamorous and effective: writing an intention in one clear sentence; catching the reflexive 'people like me can't'; choosing one action this week that a person with your goal would take. Manifestation, at ground level, is mostly congruence.",
      "Two honesty rules govern how this is taught on HealerJi. First: no outcome is guaranteed, ever, and no coach here will promise one. Second: hardship is not your fault for 'thinking wrong' — that inversion of the practice is cruelty dressed as wisdom, and we reject it plainly.",
      "What remains, stripped of magic, is still remarkable: people who spend a season aligning attention, self-talk and action tend to move. Not because the universe rearranged itself — because they did.",
    ],
  },
];

export const articleBySlug = (slug: string) => articles.find((a) => a.slug === slug);
export const articlesByPathway = (slug: string) => articles.filter((a) => a.pathway === slug);
