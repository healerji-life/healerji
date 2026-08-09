/**
 * The seven energy centres.
 *
 * Sourced from the classical descriptions carried in yogic and tantric
 * literature — the Ṣaṭ-cakra-nirūpaṇa as it reached English readers
 * through Woodroffe, and the teaching lineages that most contemporary
 * Reiki and yoga practitioners in India learn from. Where a detail is
 * modern rather than traditional (notably the Solfeggio-style
 * frequencies and the gland correspondences, both twentieth-century
 * additions) the field says so in its own text rather than presenting
 * it as ancient teaching.
 *
 * House rule throughout: tradition and experience described honestly,
 * never medical claims. "Imbalance signs" are the tradition's own
 * language for states of mind and body — not diagnoses, and every
 * surface that shows them repeats that.
 */
export interface Chakra {
  slug: string;
  order: number;
  name: string;
  /** IAST transliteration */
  sanskrit: string;
  /** Devanāgarī, as written */
  devanagari: string;
  /** seed syllable, transliterated */
  bija: string;
  /** seed syllable in Devanāgarī — the authentic written form */
  bijaDevanagari: string;
  bijaPronunciation: string;
  /** lineage note where the seed sound varies */
  bijaNote?: string;
  petals: number;
  /** modern sound-practice association, not traditional teaching */
  frequency: number;
  color: string;
  colorName: string;
  glow: string;
  element: string;
  /** precise anatomical seat, as the tradition describes it */
  location: string;
  /** the endocrine correspondence of modern chakra literature */
  gland: string;
  organs: string;
  meaning: string;
  bodyFocus: string;
  emotional: string;
  healing: string;
  tradition: string;
  /** the tradition's language for an over-expressed centre */
  overactive: string;
  /** …and for an under-expressed one */
  underactive: string;
  affirmation: string;
  crystals: string[];
  oils: string[];
  asanas: string[];
  mudra: string;
  breathwork: string;
  journalPrompt: string;
  /** chanted recording — drop the file in /public/audio/chakras/ */
  audio: string;
  modalities: string[];
}

export const chakras: Chakra[] = [
  {
    slug: "muladhara",
    order: 1,
    name: "Root",
    sanskrit: "Mūlādhāra",
    devanagari: "मूलाधार",
    bija: "LAM",
    bijaDevanagari: "लं",
    bijaPronunciation: "Long L-A-A-A-M-M — “lum”, ending in a hum at the lips",
    petals: 4,
    frequency: 396,
    color: "#A62C2B",
    colorName: "Deep red",
    glow: "rgba(166,44,43,0.30)",
    element: "Earth (pṛthvī)",
    location: "The pelvic floor, at the perineum — the base of the spine",
    gland: "Associated in modern chakra literature with the adrenal glands",
    organs: "Spoken of in relation to the legs, feet, bones and the base of the spine",
    meaning: "Mūla means root; ādhāra, support. The root support — where practice begins.",
    bodyFocus:
      "Traditionally associated with the base of the spine, the legs, and the body's sense of physical ground.",
    emotional:
      "Safety, belonging, and the quiet confidence that your needs will be met. When life feels precarious, tradition says this centre asks for attention.",
    healing:
      "Grounding breath, slow body-based practice, and sessions that begin with steadiness before anything else.",
    tradition:
      "The root of the chakra tree in tantric tradition — the seat of survival energy, and where kuṇḍalinī is said to rest coiled.",
    overactive:
      "The tradition describes an over-expressed root as rigidity: hoarding, resistance to any change, a life organised entirely around security.",
    underactive:
      "An under-expressed root is described as restlessness — feeling unwelcome anywhere, unable to settle, chronically braced.",
    affirmation: "I am here, I belong, and the ground holds me.",
    crystals: ["Red jasper", "Hematite", "Smoky quartz"],
    oils: ["Vetiver", "Cedarwood", "Patchouli"],
    asanas: ["Tāḍāsana (Mountain)", "Mālāsana (Garland)", "Bālāsana (Child)"],
    mudra: "Mūlādhāra mudrā — thumbs and index fingers joined, hands resting at the lap",
    breathwork: "Long, low belly breathing with the exhale twice the length of the inhale",
    journalPrompt: "What would 'enough' actually look like, in numbers and in days?",
    audio: "/audio/chakras/root-lam.mp3",
    modalities: ["chakra-healing", "reiki-pranic-healing", "swar-vigyan"],
  },
  {
    slug: "svadhisthana",
    order: 2,
    name: "Sacral",
    sanskrit: "Svādhiṣṭhāna",
    devanagari: "स्वाधिष्ठान",
    bija: "VAM",
    bijaDevanagari: "वं",
    bijaPronunciation: "Long V-A-A-A-M-M — “vum”, softly voiced",
    petals: 6,
    frequency: 417,
    color: "#D2691E",
    colorName: "Orange",
    glow: "rgba(210,105,30,0.30)",
    element: "Water (āpas)",
    location: "The lower abdomen, roughly two finger-widths below the navel",
    gland: "Associated in modern chakra literature with the reproductive glands",
    organs: "Spoken of in relation to the lower abdomen, hips and lower back",
    meaning: "Sva, one's own; adhiṣṭhāna, dwelling place. One's own abode.",
    bodyFocus:
      "Traditionally associated with the lower abdomen, the hips, and the body's capacity for movement and pleasure.",
    emotional:
      "Creativity, desire, playfulness, and the willingness to feel. Tradition places the appetite for life here.",
    healing:
      "Fluid movement, creative practice without a product, and sessions that give feeling somewhere to go.",
    tradition:
      "The water centre — associated with flow, sensuality, and the emotional currents beneath ordinary decisions.",
    overactive:
      "Described as being swept along: emotional volatility, appetite without discernment, seeking intensity for its own sake.",
    underactive:
      "Described as flatness — numbness, creative dryness, guilt around wanting anything at all.",
    affirmation: "I am allowed to feel, to want, and to enjoy.",
    crystals: ["Carnelian", "Orange calcite", "Moonstone"],
    oils: ["Sweet orange", "Ylang-ylang", "Sandalwood"],
    asanas: ["Baddha Koṇāsana (Bound angle)", "Bhujaṅgāsana (Cobra)", "Hip circles"],
    mudra: "Śakti mudrā — hands cupped in the lap, right over left, thumbs touching",
    breathwork: "Soft, wave-like breathing that lets the belly move freely",
    journalPrompt: "What did you enjoy, before you learned what you were supposed to enjoy?",
    audio: "/audio/chakras/sacral-vam.mp3",
    modalities: ["chakra-healing", "inner-child-healing", "crystal-healing"],
  },
  {
    slug: "manipura",
    order: 3,
    name: "Solar plexus",
    sanskrit: "Maṇipūra",
    devanagari: "मणिपूर",
    bija: "RAM",
    bijaDevanagari: "रं",
    bijaPronunciation: "Long R-A-A-A-M-M — “rum”, with a lightly rolled R",
    petals: 10,
    frequency: 528,
    color: "#D9A520",
    colorName: "Golden yellow",
    glow: "rgba(217,165,32,0.30)",
    element: "Fire (agni)",
    location: "The upper abdomen, between the navel and the base of the sternum",
    gland: "Associated in modern chakra literature with the pancreas",
    organs: "Spoken of in relation to the stomach, liver and digestive fire",
    meaning: "Maṇi, jewel; pūra, city. The city of jewels.",
    bodyFocus:
      "Traditionally associated with the upper abdomen and the body's digestive fire — the capacity to take things in and transform them.",
    emotional:
      "Will, confidence, and the ability to act on your own behalf. Tradition places self-definition here.",
    healing:
      "Breath practices that build warmth, work on boundaries, and sessions that rehearse saying what you mean.",
    tradition:
      "The fire centre — in yogic teaching the seat of tapas, the disciplined heat that transforms effort into capability.",
    overactive:
      "Described as domination: control, perfectionism, anger that arrives faster than thought.",
    underactive:
      "Described as deferral — chronic people-pleasing, indecision, waiting for permission that never comes.",
    affirmation: "I can act, and my judgement is worth trusting.",
    crystals: ["Citrine", "Tiger's eye", "Yellow jasper"],
    oils: ["Lemon", "Ginger", "Roman chamomile"],
    asanas: ["Navāsana (Boat)", "Dhanurāsana (Bow)", "Vīrabhadrāsana III (Warrior III)"],
    mudra: "Rudra mudrā — thumb, index and ring fingertips joined",
    breathwork: "Kapālabhāti at a gentle pace, or simply a firm, complete exhale",
    journalPrompt: "Where in your week are you waiting for permission you could give yourself?",
    audio: "/audio/chakras/solar-plexus-ram.mp3",
    modalities: ["chakra-healing", "life-coach", "nlp"],
  },
  {
    slug: "anahata",
    order: 4,
    name: "Heart",
    sanskrit: "Anāhata",
    devanagari: "अनाहत",
    bija: "YAM",
    bijaDevanagari: "यं",
    bijaPronunciation: "Long Y-A-A-A-M-M — “yum”, opening the chest",
    petals: 12,
    frequency: 639,
    color: "#1F7A4D",
    colorName: "Emerald green",
    glow: "rgba(31,122,77,0.30)",
    element: "Air (vāyu)",
    location: "The centre of the chest, at the sternum — not over the physical heart",
    gland: "Associated in modern chakra literature with the thymus",
    organs: "Spoken of in relation to the chest, lungs, and the circulation of breath",
    meaning: "Anāhata — 'unstruck'. The sound made without two things striking together.",
    bodyFocus:
      "Traditionally associated with the centre of the chest and the breath that moves through it.",
    emotional:
      "Love, grief, forgiveness, and the willingness to stay open after being hurt. Tradition treats these as one subject, not four.",
    healing:
      "Breath into the chest, forgiveness practices like Ho'oponopono, and sessions that let grief be present without being fixed.",
    tradition:
      "The bridge of the system — the meeting point of the three lower centres and the three above, where personal feeling becomes something wider.",
    overactive:
      "Described as self-abandonment: giving past your own limits, losing yourself in others, love that requires no reciprocity to continue.",
    underactive:
      "Described as guardedness — keeping people at a measured distance, holding old grievances as protection.",
    affirmation: "I can stay open, and I can also have limits.",
    crystals: ["Rose quartz", "Green aventurine", "Rhodonite"],
    oils: ["Rose", "Bergamot", "Geranium"],
    asanas: ["Uṣṭrāsana (Camel)", "Setu Bandhāsana (Bridge)", "Supported reclined chest opener"],
    mudra: "Padma mudrā — palms together at the heart, opening like a lotus",
    breathwork: "Even breathing, four counts in and four out, with a hand at the sternum",
    journalPrompt: "Who are you still carrying unforgiven — including yourself?",
    audio: "/audio/chakras/heart-yam.mp3",
    modalities: ["chakra-healing", "hooponopono-healing", "reiki-pranic-healing"],
  },
  {
    slug: "vishuddha",
    order: 5,
    name: "Throat",
    sanskrit: "Viśuddha",
    devanagari: "विशुद्ध",
    bija: "HAM",
    bijaDevanagari: "हं",
    bijaPronunciation: "Long H-A-A-A-M-M — “hum”, resonant in the throat",
    petals: 16,
    frequency: 741,
    color: "#2E6DA4",
    colorName: "Sky blue",
    glow: "rgba(46,109,164,0.30)",
    element: "Ether / space (ākāśa)",
    location: "The centre of the throat, at the hollow above the collarbones",
    gland: "Associated in modern chakra literature with the thyroid",
    organs: "Spoken of in relation to the throat, neck, jaw and voice",
    meaning: "Viśuddha — 'especially pure'. The centre of clear expression.",
    bodyFocus:
      "Traditionally associated with the throat and everything that passes through it: speech, sound, and swallowed words.",
    emotional:
      "Honesty, expression, and the courage to say the true thing. Tradition holds that unsaid words gather here.",
    healing:
      "Chanting and sound practice, work with the seed sound, and sessions that rehearse difficult conversations aloud.",
    tradition:
      "The centre of ākāśa — space itself, in which sound can exist at all. Purification here is understood as the removal of distortion.",
    overactive:
      "Described as speech without listening: talking over, oversharing, using words as a way of not feeling.",
    underactive:
      "Described as swallowing — going quiet in conflict, agreeing outwardly, the sentence rehearsed and never said.",
    affirmation: "What I have to say is allowed to take up space.",
    crystals: ["Lapis lazuli", "Aquamarine", "Blue lace agate"],
    oils: ["Eucalyptus", "Peppermint", "Frankincense"],
    asanas: ["Matsyāsana (Fish)", "Sarvāṅgāsana (Shoulderstand)", "Slow neck releases"],
    mudra: "Granthita mudrā — fingers interlaced, thumbs and index fingers touching, held at the throat",
    breathwork: "Ujjāyī — the soft ocean sound made at the back of the throat",
    journalPrompt: "What sentence have you rehearsed but never said aloud?",
    audio: "/audio/chakras/throat-ham.mp3",
    modalities: ["chakra-healing", "swar-vigyan", "life-coach"],
  },
  {
    slug: "ajna",
    order: 6,
    name: "Third eye",
    sanskrit: "Ājñā",
    devanagari: "आज्ञा",
    bija: "OM",
    bijaDevanagari: "ॐ",
    bijaPronunciation: "A-A-U-U-M — the full “aum”, ending in a closed hum",
    petals: 2,
    frequency: 852,
    color: "#3B4CA8",
    colorName: "Indigo",
    glow: "rgba(59,76,168,0.30)",
    element: "Mind (manas) — beyond the five gross elements",
    location: "Between the eyebrows, at the brow centre",
    gland: "Associated in modern chakra literature with the pituitary",
    organs: "Spoken of in relation to the eyes, the brow, and the faculty of attention",
    meaning: "Ājñā — 'command' or 'perceiving'. The centre of inner knowing.",
    bodyFocus:
      "Traditionally associated with the space between the eyebrows and the quality of attention itself.",
    emotional:
      "Insight, discernment, and the difference between intuition and anxiety wearing its clothes.",
    healing:
      "Stillness practice, trāṭaka and gazing work, and sessions that slow the mind enough for it to be heard.",
    tradition:
      "Where the iḍā, piṅgalā and suṣumnā channels are said to meet — the two petals representing that convergence.",
    overactive:
      "Described as living in the head: rumination, prophecy mistaken for planning, dissociation from the body.",
    underactive:
      "Described as fog — mistrusting your own read of a situation, deferring entirely to others' certainty.",
    affirmation: "I can trust what I notice, and check it honestly.",
    crystals: ["Amethyst", "Sodalite", "Labradorite"],
    oils: ["Clary sage", "Juniper", "Vetiver"],
    asanas: ["Bālāsana with brow to the mat", "Supported forward fold", "Seated stillness"],
    mudra: "Jñāna mudrā — thumb and index fingertips joined, hands on the knees",
    breathwork: "Nāḍī śodhana — alternate nostril breathing, unhurried",
    journalPrompt: "What have you known for a while and not yet admitted you know?",
    audio: "/audio/chakras/third-eye-om.mp3",
    modalities: ["chakra-healing", "akashic-records-reader", "subliminal-healing"],
  },
  {
    slug: "sahasrara",
    order: 7,
    name: "Crown",
    sanskrit: "Sahasrāra",
    devanagari: "सहस्रार",
    bija: "OM",
    bijaDevanagari: "ॐ",
    bijaPronunciation: "A-A-U-U-M, dissolving into silence",
    bijaNote:
      "Lineages differ here. Many teach the crown as silence — the centre beyond sound — while others give it ॐ. Both are offered honestly rather than picking one and calling it the tradition.",
    petals: 1000,
    frequency: 963,
    color: "#6B4B9A",
    colorName: "Violet, with a white glow",
    glow: "rgba(107,75,154,0.30)",
    element: "Beyond the elements",
    location: "Just above the crown of the head — not inside the skull",
    gland: "Associated in modern chakra literature with the pineal",
    organs: "Spoken of in relation to the crown of the head and the nervous system as a whole",
    meaning: "Sahasra, a thousand; āra, spoke. The thousand-petalled lotus.",
    bodyFocus:
      "Traditionally described as resting just above the head rather than within the body — the point where the individual is said to meet what is larger.",
    emotional:
      "Meaning, perspective, and the relief of being part of something you did not have to invent.",
    healing:
      "Silence, meditation without technique, and sessions that ask nothing of you at all.",
    tradition:
      "The thousand-petalled lotus of the tantric texts — the destination of kuṇḍalinī's ascent, and traditionally approached last.",
    overactive:
      "Described as ungroundedness: spiritual bypassing, disconnection from ordinary life and its obligations.",
    underactive:
      "Described as flatness of meaning — cynicism, a life that works and still feels hollow.",
    affirmation: "I am part of something larger, and I do not have to understand it.",
    crystals: ["Clear quartz", "Selenite", "Amethyst"],
    oils: ["Frankincense", "Lotus", "Lavender"],
    asanas: ["Śavāsana (Corpse)", "Śīrṣāsana where practised safely", "Seated meditation"],
    mudra: "Sahasrāra mudrā — hands above the head, fingertips together, opening upward",
    breathwork: "No technique. Watch the breath arrive without arranging it.",
    journalPrompt: "When did you last feel part of something larger than your own week?",
    audio: "/audio/chakras/crown-om.mp3",
    modalities: ["chakra-healing", "spiritual-healing", "reiki-pranic-healing"],
  },
];

export const chakraBySlug = (slug: string) => chakras.find((c) => c.slug === slug);
