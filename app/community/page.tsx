import type { Metadata } from "next";
import Link from "next/link";
import { Flag, HeartHandshake, MessageCircleHeart, Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { concerns } from "@/lib/config/taxonomy";

export const metadata: Metadata = {
  title: "Community — a moderated space that cares",
  description:
    "HealerJi's community: healing circles by concern, shared stories, live gatherings, and clear guidelines — moderated so it stays safe. Join free through the HealerJi app.",
};

const guidelines = [
  { t: "Speak from your own seat", d: "Share your experience, not prescriptions. 'This helped me' is welcome; 'you must do this' is not — and medical advice belongs to doctors." },
  { t: "Hold what's shared", d: "Stories told here stay here. Screenshotting or sharing another member's story outside the community is grounds for removal." },
  { t: "Kindness is the entry fee", d: "Disagreement is fine; contempt is not. No mockery of anyone's practice, faith, language, or pain." },
  { t: "No selling, no soliciting", d: "Healers offer sessions through their profiles, never through DMs or comment threads. Report anyone who solicits you directly." },
  { t: "Crisis gets a human", d: "If you or someone in a thread is in danger, don't rely on the thread. Call Tele-MANAS 14416 or emergency 112, and flag the post so our moderators can respond." },
];

export default function CommunityPage() {
  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="max-w-2xl">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">Community</p>
          <h1 className="mt-3 text-4xl md:text-5xl">Healing rarely happens entirely alone.</h1>
          <p className="mt-5 text-lg text-ink-600 dark:text-mist-400">
            The HealerJi community is a moderated space to share your story,
            hear others', join live circles, and discover you were never the
            only one. It lives inside the HealerJi app — free to join, watched
            over by a real moderation team.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link href="/app">Join through the app</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/stories">Read shared stories</Link>
            </Button>
          </div>
        </header>

        <section className="mt-32" aria-labelledby="circles-heading">
          <Reveal>
            <h2 id="circles-heading" className="text-2xl">Healing circles</h2>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              Circles gather people walking the same pathway — five rooms, one
              for each of the concerns HealerJi serves.
            </p>
          </Reveal>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {concerns.map((p, i) => (
              <Reveal as="li" key={p.slug} delay={i * 0.04}>
                <Link
                  href={`/paths/${p.slug}`}
                  className="flex h-full flex-col rounded-md bg-surface-0 p-5 shadow-e-1 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2 dark:bg-night-900"
                >
                  <Users className="h-5 w-5 text-ink-900 dark:text-surface-0" aria-hidden />
                  <span className="mt-3 font-display text-lg">{p.name}</span>
                  <span className="mt-1 text-sm text-mist-500">{p.nameHi}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>

        <section className="mt-32 grid gap-6 md:grid-cols-3" aria-label="What happens in the community">
          {[
            { icon: MessageCircleHeart, t: "Shared stories", d: "Members write what they're carrying and what helped — in English, Hindi, and everything between. Sharing your journey can itself be part of healing.", href: "/stories", cta: "Read stories" },
            { icon: HeartHandshake, t: "Live gatherings", d: "Webinars and workshops where circles meet in real time, practise together, and stay for the questions.", href: "/events", cta: "See gatherings" },
            { icon: Flag, t: "Real moderation", d: "A human moderation team reviews reports, removes solicitation and unkindness, and keeps this a safe room — as promised in our terms.", href: "/trust", cta: "How safety works" },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 0.05}>
              <SpotlightCard as="article" className="flex h-full flex-col rounded-md border border-surface-200 p-8 dark:border-night-900">
                <c.icon className="h-5 w-5 text-ink-900 dark:text-surface-0" aria-hidden />
                <h3 className="mt-4 font-display text-xl">{c.t}</h3>
                <p className="mt-3 flex-1 text-ink-600 dark:text-mist-400">{c.d}</p>
                <Button variant="tertiary" className="mt-4 self-start px-0" asChild>
                  <Link href={c.href}>{c.cta} →</Link>
                </Button>
              </SpotlightCard>
            </Reveal>
          ))}
        </section>

        <section className="mt-32 max-w-3xl" aria-labelledby="guidelines-heading">
          <Reveal>
            <h2 id="guidelines-heading" className="text-2xl">Community guidelines</h2>
            <p className="measure mt-3 text-ink-600 dark:text-mist-400">
              Five rules, enforced by humans. They exist so the most fragile
              person in the room is safe — which, some days, is each of us.
            </p>
          </Reveal>
          <ol className="mt-8 space-y-6">
            {guidelines.map((g, i) => (
              <Reveal as="li" key={g.t} delay={i * 0.04} className="flex gap-5">
                <span className="font-display text-2xl text-plum-300" aria-hidden>{i + 1}</span>
                <div>
                  <p className="font-medium">{g.t}</p>
                  <p className="mt-1 text-ink-600 dark:text-mist-400">{g.d}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <p className="measure mt-10 rounded-md bg-surface-100 p-5 text-sm text-ink-600 dark:bg-night-900 dark:text-mist-400">
            To report a post or member, use the flag inside the app, or write to{" "}
            <a href="mailto:support@healerji.com" className="underline underline-offset-2">support@healerji.com</a>.
            Moderation decisions follow our <Link href="/legal/terms" className="underline underline-offset-2">terms of service</Link>.
          </p>
        </section>
      </Container>
    </div>
  );
}
