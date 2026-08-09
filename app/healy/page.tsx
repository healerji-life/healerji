import type { Metadata } from "next";
import Link from "next/link";
import { Ear, HeartHandshake, Languages, ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { HealyExperience } from "@/components/healy-experience";
import { listPublicHealersForSite } from "@/lib/services/healers";
import { listPublishedArticles } from "@/lib/services/articles";
import { toArticles } from "@/lib/services/article-adapter";
import { FounderNote } from "@/components/founder-note";
import { GlowBorder } from "@/components/motion/glow-border";

export const metadata: Metadata = {
  title: "Healy — HealerJi's AI assistant",
  description:
    "Healy listens first and points you to the right pathway, healers, and practices — privately, in your language. Guided on the web; full conversation in the HealerJi app.",
};

const capabilities = [
  { icon: Ear, title: "Listens before suggesting", body: "Healy asks what's heavy and why before it recommends anything — and always shows its reasoning." },
  { icon: HeartHandshake, title: "Recommends real help", body: "A pathway, matched certified healers, and one free practice from the Library — never a sales pitch." },
  { icon: Languages, title: "Speaks your language", body: "Hindi and English today in the app; recommendations here account for the language you heal in." },
  { icon: ShieldAlert, title: "Knows its limits", body: "Healy is not a therapist or doctor. In any crisis, its only job is connecting you to real human help, immediately." },
];

const faqs = [
  { q: "Is Healy free?", a: "Yes — the guided experience here and Healy in the HealerJi app are free to use. You pay only when you book a session with a healer." },
  { q: "Is my conversation private?", a: "Yes. Conversations aren't shared with healers or anyone else without your permission, and they're never used to pressure you into booking. See our privacy policy for the full picture." },
  { q: "Can Healy diagnose me or replace therapy?", a: "No, and it will tell you so itself. Healy offers orientation and traditional practice suggestions — for medical or mental-health conditions, it will always point you to qualified professionals." },
  { q: "Where's the full chat version?", a: "In the HealerJi app, where Healy holds free-form conversations. The web version is deliberately guided so it works instantly for everyone." },
];

export default async function HealyPage() {
  // DATABASE-BACKED as of pass 4.
  const [healerResult, articleResult] = await Promise.all([
    listPublicHealersForSite(),
    listPublishedArticles(),
  ]);
  const healers = healerResult.ok ? healerResult.data : [];
  const articles = articleResult.ok ? toArticles(articleResult.data) : [];

  return (
    <div className="pb-40 pt-44">
      <Container className="grid items-start gap-14 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
              Healy · AI assistant
            </p>
            <h1 className="mt-3 max-w-[14ch] text-4xl md:text-5xl">
              Someone to talk to, before you talk to someone.
            </h1>
            <p className="measure mt-5 text-lg text-ink-600 dark:text-mist-400">
              Tell Healy what's heavy. It will suggest a pathway, introduce the
              right certified healers, and hand you one free practice for
              tonight — with its reasoning shown, and your privacy kept.
            </p>
          </Reveal>
          <ul className="mt-10 space-y-6">
            {capabilities.map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 0.05} className="flex gap-4">
                <c.icon className="mt-1 h-4 w-4 shrink-0 text-ink-900 dark:text-surface-0" aria-hidden />
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-ink-600 dark:text-mist-400">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal delay={0.1} className="lg:sticky lg:top-28">
          <GlowBorder>
            <HealyExperience healers={healers} articles={articles} />
          </GlowBorder>
        </Reveal>
      </Container>

      <Container className="mt-32 max-w-3xl">
        <Reveal>
          <FounderNote className="mb-24">
            &ldquo;An assistant should never pretend to be a healer. Healy&rsquo;s
            job is to listen well enough to hand you to the right human.&rdquo;
          </FounderNote>
          <h2 className="text-2xl">Questions people ask Healy about Healy</h2>
        </Reveal>
        <div className="mt-6 divide-y divide-surface-200 dark:divide-night-900">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="ml-4 text-mist-500 transition-transform duration-200 group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="measure mt-3 text-ink-600 dark:text-mist-400">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="measure mt-10 rounded-md bg-surface-100 p-5 text-sm leading-relaxed text-ink-600 dark:bg-night-900 dark:text-mist-400">
          Healy offers orientation, tradition, and encouragement — not medical,
          psychological, legal or financial advice. If you are in crisis, call
          Tele-MANAS at 14416 (free, 24×7, Government of India) or emergency
          services at 112. Full details on our{" "}
          <Link href="/trust" className="underline underline-offset-2">Trust & Safety page</Link>.
        </p>
        <div className="mt-10 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/app">Get full Healy in the app</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/healers">Skip to the healers</Link>
          </Button>
        </div>
      </Container>
    </div>
  );
}
