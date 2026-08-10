import type { Metadata } from "next";
import Link from "next/link";
import { CalendarHeart, Radio, Video } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Webinars & workshops",
  description:
    "Live webinars and small workshops led by HealerJi's certified healers — breathwork, chakra practice, forgiveness work and more. Dates and registration live in the HealerJi app.",
};

/**
 * Honest events page: HealerJi's live programme formats are described
 * truthfully; specific dated listings render from the platform (inside
 * the app), so this page never shows an invented calendar.
 */
const formats = [
  { icon: Radio, name: "Open webinars", body: "Large, welcoming, free-or-low-cost sessions where a healer teaches one practice live — breath, chakra balancing, Law of Attraction — with Q&A at the end. Come camera-off if you like.", note: "Typically 60–90 minutes" },
  { icon: Video, name: "Small workshops", body: "Deeper sessions on a single practice with limited seats, so the healer can actually see you. Expect to participate, practise, and leave with homework you'll want to do.", note: "Small groups · limited seats" },
  { icon: CalendarHeart, name: "Healing circles, live", body: "Pathway circles meeting in real time — the community's rooms with a healer holding the space. The gentlest doorway if one-to-one still feels like a big step.", note: "Recurring · by pathway" },
];

export default function EventsPage() {
  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="max-w-2xl">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            Webinars & workshops
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl">Practise in company.</h1>
          <p className="mt-5 text-lg text-ink-600 dark:text-mist-400">
            Some things land differently in a room full of people discovering
            they're not the only one. HealerJi's healers teach live in three
            formats; the full dated calendar and registration live in the app,
            where reminders can find you.
          </p>
        </header>
        <ul className="mt-16 grid gap-6 md:grid-cols-3">
          {formats.map((f, i) => (
            <Reveal as="li" key={f.name} delay={i * 0.05}>
              <article className="flex h-full flex-col rounded-md bg-surface-0 p-8 shadow-e-1 dark:bg-night-900">
                <f.icon className="h-5 w-5 text-ink-900 dark:text-surface-0" aria-hidden />
                <h2 className="mt-4 font-display text-xl">{f.name}</h2>
                <p className="mt-3 flex-1 text-ink-600 dark:text-mist-400">{f.body}</p>
                <p className="mt-4 text-[13px] uppercase tracking-[0.14em] text-mist-500">{f.note}</p>
              </article>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-16 rounded-md border border-ink-900/10 p-8 dark:border-surface-0/10">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            In preparation
          </p>
          <p className="measure mt-5 text-lg text-ink-600 dark:text-mist-400">
            Our healers are building the first season of live sessions now.
            We will publish dates once every one of them is confirmed —
            an empty calendar is more honest than an invented one.
          </p>
          <p className="measure mt-4 text-ink-600 dark:text-mist-400">
            To hear the moment the first sessions are scheduled, write to{" "}
            <a href="mailto:support@healerji.com?subject=Webinar%20updates" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">
              support@healerji.com
            </a>{" "}
            — or book a one-to-one session, which is available today.
          </p>
          <Button className="mt-7" asChild>
            <Link href="/healers">Book a session instead</Link>
          </Button>
        </Reveal>
      </Container>
    </div>
  );
}
