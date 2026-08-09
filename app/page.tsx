import { Hero } from "@/components/home/hero";
import { FounderSection } from "@/components/home/founder-section";
import { PathsSection } from "@/components/home/paths-section";
import { ChakraSection } from "@/components/home/chakra-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { HealersSection } from "@/components/home/healers-section";
import { HealySection } from "@/components/home/healy-section";
import { StoriesSection } from "@/components/home/stories-section";
import { GatheringsSection } from "@/components/home/gatherings-section";
import { AppSection } from "@/components/home/app-section";
import { ClosingCta } from "@/components/home/closing-cta";
import { BreathInterlude } from "@/components/motion/breath-interlude";
import { Spine, SpineNode } from "@/components/motion/spine";

/**
 * The homepage is a sequence of feelings, in this order:
 *
 *   curiosity   Hero — a line that opens a question
 *   wonder      Chakra — the map, alive
 *   safety      Paths — you are already covered here
 *   calm        Breath interlude — the page stops to breathe
 *   discovery   Healy — something unexpected that listens
 *   trust       Healers, then How it works — faces, then mechanics
 *   connection  Stories, Gatherings — you are not the only one
 *   hope        Founder — someone's life's work
 *   action      App, Closing — one clear door
 *
 * Everything hangs from the Thread, so the sections read as one
 * descent rather than a stack of pages.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Spine>
        <ChakraSection />
        <SpineNode />
        <PathsSection />
        <BreathInterlude />
        <HealySection />
        <SpineNode />
        <HealersSection />
        <HowItWorks />
        <SpineNode />
        <StoriesSection />
        <GatheringsSection />
        <FounderSection />
        <AppSection />
      </Spine>
      <ClosingCta />
    </>
  );
}
