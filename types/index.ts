export type PathSlug =
  | "emotional-wellbeing"
  | "relationships"
  | "career-purpose"
  | "money-abundance"
  | "health-vitality";

export interface Path {
  slug: PathSlug;
  name: string;
  nameHi: string;
  line: string;
  texture: string; // tailwind gradient classes for the tile
}

export interface Modality {
  slug: string;
  name: string;
  essence: string;
  what: string;
  session: string;
  isNot: string;
  paths: PathSlug[];
}

export type SessionType = "chat" | "audio" | "video";

export interface Healer {
  slug: string;
  name: string;
  headline: string;
  modalities: string[];
  languages: string[];
  gender: "female" | "male" | "other" | "undisclosed" | null;
  years: number;
  rating: number;
  reviews: number;
  pricePaise: number; // intro session, 20 min
  /**
   * ISO timestamp of the healer's next genuinely open slot, or null when they
   * have published no availability. Computed by public.healers_next_available.
   * Never a formatted string: the UI decides how to phrase it, and null must
   * not be rendered as a guess.
   */
  nextAvailableAt: string | null;
  verified: { identity: boolean; credentials: boolean; interviewed: boolean };
  bio: string;
  sessionTypes: SessionType[];
}

export interface Testimonial {
  name: string;
  path: PathSlug;
  quote: string;
  anonymous: boolean;
}
