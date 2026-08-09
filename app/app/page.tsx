import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CalendarHeart, Headphones, Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { AppLinks } from "@/components/app-links";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Get the HealerJi app",
  description: "The full HealerJi experience — sessions, audio meditations, Healy AI conversations, community and the live events calendar — on Android and iOS.",
};

const inApp = [
  { icon: Headphones, t: "Audio that travels", d: "Guided meditations and subliminal tracks that play offline — for commutes, 3 am, and everywhere between." },
  { icon: Bot, t: "Full Healy conversations", d: "The free-form version of Healy, in Hindi and English, with your context remembered between visits." },
  { icon: Users, t: "The community", d: "Healing circles, shared stories, and a moderated room that's kind on purpose." },
  { icon: CalendarHeart, t: "The live calendar", d: "Webinars and workshops, with one-tap registration and reminders." },
];

export default function AppPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="The app"
        title="The full HealerJi, in your pocket."
        lede="The website introduces the platform; the app is where daily practice lives. Free to download, free to join."
      />
      <Container className="mt-14">
        <ul className="grid gap-6 sm:grid-cols-2">
          {inApp.map((f, i) => (
            <Reveal as="li" key={f.t} delay={i * 0.04} className="flex gap-4 rounded-md bg-surface-0 p-6 shadow-e-1 dark:bg-night-900">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-900 dark:text-surface-0" aria-hidden />
              <div>
                <h2 className="font-display text-lg">{f.t}</h2>
                <p className="mt-1 text-ink-600 dark:text-mist-400">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <AppLinks />

        </div>
        <p className="mt-8 text-sm text-mist-500">
          Prefer the web? Sessions can be booked <Link href="/book" className="underline underline-offset-2">right here</Link> too.
        </p>
      </Container>
    </div>
  );
}
