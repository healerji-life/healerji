/**
 * LEGACY SEED DATA — superseded by the database in pass 6.
 *
 * /practices, /practices/[slug], the chakra cross-link and the sitemap all read
 * Supabase now. This array remains solely as the input to
 * scripts/generate-seed.mjs. Safe to delete once you no longer regenerate the
 * seed from source.
 *
 * Original note, still true of the data itself: paced, step-by-step sessions the
 * reader can actually *do*, not articles about doing them.
 *
 * Each step carries its own duration, so the player can pace the
 * practice, show progress, and know when it is complete. `audio` is
 * optional and unset for now: no recordings have been supplied, and
 * we would rather ship a working timed practice than a player with a
 * dead play button. When tracks arrive, set `audio` and the player
 * uses them automatically.
 */
export type { Practice, PracticeStep, PracticeCategory } from "@/lib/content/practice";
import type { Practice } from "@/lib/content/practice";

export const practices: Practice[] = [
  {
    slug: "nine-minute-breath",
    title: "Nine minutes of breath",
    category: "Breath",
    minutes: 9,
    standfirst:
      "The Swar Vigyan practice our healers teach most often — observation before control, counted exhales, nothing to get right.",
    steps: [
      { say: "Sit or lie however you're comfortable. Let your hands rest. Nothing to fix yet — just arrive.", seconds: 40 },
      { say: "Close your right nostril gently with your thumb. Breathe through the left. Notice how freely it flows.", seconds: 45 },
      { say: "Switch. Close the left, breathe through the right. Notice the difference — don't correct it.", seconds: 45 },
      { say: "Let both hands rest. Breathe normally. This noticing is itself the first medicine.", seconds: 40 },
      { say: "Now count each exhale, one to ten. When you reach ten, begin again at one.", seconds: 120 },
      { say: "The mind will wander. That is its job. Return to one, without commentary.", seconds: 120 },
      { say: "Keep counting. Slower now if it suits you. Nowhere else to be for these two minutes.", seconds: 120 },
      { say: "Let the counting go. Sit with whatever is here — quieter, or not. Both are fine.", seconds: 60 },
      { say: "When you're ready, open your eyes. Move slowly for a moment before you stand.", seconds: 30 },
    ],
    after:
      "If sleeplessness or worry is constant, please also speak with a doctor or counsellor. This is a companion for hard nights, not a treatment for a condition.",
  },
  {
    slug: "four-phrases",
    title: "The four phrases",
    category: "Forgiveness",
    minutes: 7,
    standfirst:
      "Ho'oponopono, practised slowly: I'm sorry. Please forgive me. Thank you. I love you — offered wherever it's hardest.",
    steps: [
      { say: "Settle. Three slow breaths, longer out than in.", seconds: 40 },
      { say: "Bring one person to mind. Not the hardest one yet — someone the heart can hold today.", seconds: 45 },
      { say: "Say, silently or aloud: I'm sorry. Let it be simple. Repeat it until it stops being a performance.", seconds: 75 },
      { say: "Please forgive me. Notice what argues back. Let it argue; keep saying the words.", seconds: 75 },
      { say: "Thank you. For what they gave, or taught, or survived alongside you.", seconds: 75 },
      { say: "I love you. Whatever that means today — respect, release, or simply the wish that they be well.", seconds: 75 },
      { say: "Now, if you're willing, turn all four phrases toward yourself. Most people find this the hardest part.", seconds: 90 },
      { say: "Rest. Nothing needs resolving today. Something has already moved.", seconds: 45 },
    ],
    after:
      "Releasing the weight of a wound is not the same as declaring it acceptable. You can do this at your own pace, including not yet.",
  },
  {
    slug: "grounding-five",
    title: "Grounding, in five minutes",
    category: "Grounding",
    minutes: 5,
    standfirst:
      "For the moments when the day gets ahead of you — attention brought back to the body, one sense at a time.",
    steps: [
      { say: "Plant both feet. Feel the floor take your weight. It has been doing so all along.", seconds: 45 },
      { say: "Name five things you can see. Slowly, in your head, one by one.", seconds: 60 },
      { say: "Four things you can feel. Fabric, air, the chair, your own hands.", seconds: 60 },
      { say: "Three things you can hear. Include the sounds you'd normally filter out.", seconds: 50 },
      { say: "Two things you can smell, or the memory of two. One thing you can taste.", seconds: 45 },
      { say: "One long breath out. You are here, and here is manageable.", seconds: 40 },
    ],
    after:
      "Panic and constant anxiety deserve professional support alongside practices like this. Tele-MANAS: 14416.",
  },
  {
    slug: "heart-centre-rest",
    title: "Rest at the heart centre",
    category: "Energy",
    minutes: 8,
    standfirst:
      "A gentle energy practice on the anahata centre, for grief, guardedness, and the chest that's felt tight for weeks.",
    steps: [
      { say: "Lie down if you can. Place one hand at the centre of your chest — not the left side, the middle.", seconds: 50 },
      { say: "Breathe so that your hand rises. Let the breath be low and unhurried.", seconds: 70 },
      { say: "Imagine warmth under your palm. Not a colour, not a light show — just warmth, the way a hand warms a cup.", seconds: 80 },
      { say: "If grief arrives, let it. You don't have to do anything with it. It is allowed to be here.", seconds: 90 },
      { say: "Breathe into the warmth. Widen it gently, at whatever pace it agrees to.", seconds: 80 },
      { say: "Now let the imagery go. Keep the hand. Keep the breath.", seconds: 70 },
      { say: "Come back slowly. Wiggle your fingers before you sit up.", seconds: 40 },
    ],
    after:
      "Energy practices sit alongside medical care, never instead of it. Chest pain of any kind belongs to a doctor first.",
  },
];

export const practiceBySlug = (slug: string) => practices.find((p) => p.slug === slug);
export const practiceMinutes = (p: Practice) =>
  Math.round(p.steps.reduce((t, s) => t + s.seconds, 0) / 60);
