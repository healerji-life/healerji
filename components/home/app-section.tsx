import { Smartphone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { AppLinks } from "@/components/app-links";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/reveal";
import { BreathingMark } from "@/components/breathing-mark";

export function AppSection() {
  return (
    <section className="py-32 md:py-52" aria-labelledby="app-heading">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            id="app-heading"
            eyebrow="HealerJi in your pocket"
            title="The app is where the ritual lives."
            lede="Healers available around the clock, live workshops, Healy for guidance between sessions, and reminders that feel like a friend's nudge — the app is where your practice lives."
            className="mb-8"
          />
          <p className="mb-6 text-lg text-ink-600 dark:text-mist-400">
            Take HealerJi with you.
          </p>
          <AppLinks />
        </Reveal>

        {/* Typographic device mock — no fake screenshots */}
        <Reveal delay={0.1} className="flex justify-center">
          <div
            aria-hidden
            className="w-[300px] rounded-[36px] bg-night-950 p-3 shadow-e-2 ring-1 ring-ink-900/10"
          >
            <div className="rounded-[26px] bg-surface-0 p-6 dark:bg-night-900">
              <div className="flex items-center justify-between">
                <BreathingMark size={20} />
                <span className="text-xs text-mist-500">7:00 am</span>
              </div>
              <p className="mt-8 font-display text-2xl leading-snug">
                Good morning, gently.
              </p>
              <p className="mt-3 text-sm text-ink-600">
                Today's practice: nine minutes of Swar Vigyan with Kabir.
              </p>
              <div className="mt-6 rounded-md bg-plum-100 p-4 text-sm text-plum-900">
                Session with Meera · today, 6:30 pm
              </div>
              <div className="mt-3 rounded-md bg-surface-100 p-4 text-sm text-ink-600">
                <Smartphone className="mb-2 h-4 w-4" />
                Day 12 of showing up. Welcome back.
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
