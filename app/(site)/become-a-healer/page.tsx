import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { HealerApplyForm } from "@/components/healer-apply-form";
import { FounderNote } from "@/components/founder-note";

export const metadata: Metadata = {
  title: "Become a healer on HealerJi",
  description: "Join HealerJi's certified panel: apply, be vetted through a real conversation, and meet seekers across India over chat, audio and video — with transparent earnings.",
};

const steps = [
  { t: "Apply", d: "The form below — your practices, experience, languages, and how you work. Ten minutes, no essays." },
  { t: "A real conversation", d: "Our team reviews your certifications and experience, then meets you on a video call. It's a conversation about how you hold people, not an exam." },
  { t: "Build your profile", d: "Your bio in your own words (bilingual welcome), your practices, your languages, your session price — set by you, shown transparently." },
  { t: "Meet your first seeker", d: "Sessions over chat, audio or video, on your own availability. Reviews come only from completed sessions, so your reputation is built on real work." },
];

export default function BecomeAHealerPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="For healers"
        title="Your practice deserves a real platform."
        lede="HealerJi exists for two groups: people who need healing, and the certified healers they can't currently find. If you're the second, this page is your door."
      />
      <Container className="mt-14">
        <ol className="grid gap-8 md:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.t} delay={i * 0.05}>
              <span className="font-display text-4xl font-light text-plum-300" aria-hidden>0{i + 1}</span>
              <h2 className="mt-3 font-display text-lg">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-mist-400">{s.d}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-24">
          <FounderNote>
            &ldquo;I have been on your side of this. A healer without a platform
            spends more time finding people than helping them.&rdquo;
          </FounderNote>
        </Reveal>
        <div id="earnings" className="mt-16 max-w-2xl rounded-md bg-surface-100 p-8 dark:bg-night-900">
          <h2 className="font-display text-xl">How earnings work</h2>
          <p className="mt-3 text-ink-600 dark:text-mist-400">
            You set your session price; seekers see it before booking; HealerJi
            retains a platform fee from each completed session and pays out the
            rest on a regular schedule with a clear statement. Exact fee terms
            are shared during onboarding, in writing, before you commit —
            never discovered afterwards.
          </p>
        </div>
        <div className="mt-16 max-w-3xl">
          <h2 className="text-2xl">Apply now</h2>
          <div className="mt-8">
            <HealerApplyForm />
          </div>
        </div>
      </Container>
    </div>
  );
}
