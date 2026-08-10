import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { PageIntro } from "@/components/page-intro";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Corporate wellness",
  description: "Bring HealerJi to your team: live workshops, webinars, and one-to-one sessions with certified healers — measured by participation, not promises.",
};

const offerings = [
  { t: "Live team workshops", d: "Certified healers lead your team through breath practice, stress-release and chakra-based grounding — on video or at your office in Delhi NCR." },
  { t: "Webinar programmes", d: "Monthly all-hands wellbeing webinars: practical, secular in framing, and welcoming to sceptics — the colleagues who need it most." },
  { t: "One-to-one session credits", d: "Give employees private session credits they redeem with any healer on the panel, in their own language, on their own time — with individual usage never reported back to you." },
];

export default function ForBusinessPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Corporate wellness"
        title="Care your team can feel."
        lede="Stress is the tax every workplace pays. HealerJi brings certified healers to your team — live workshops, webinars, and private session credits — measured honestly by participation and feedback, never by miracle claims."
      />
      <Container className="mt-14 grid gap-6 md:grid-cols-3">
        {offerings.map((o, i) => (
          <Reveal key={o.t} delay={i * 0.05}>
            <SpotlightCard as="article" className="h-full rounded-md border border-surface-200 p-8 dark:border-night-900">
              <h2 className="font-display text-xl">{o.t}</h2>
              <p className="mt-3 text-ink-600 dark:text-mist-400">{o.d}</p>
            </SpotlightCard>
          </Reveal>
        ))}
      </Container>
      <Container className="mt-16 max-w-2xl">
        <h2 className="text-2xl">Talk to us about your team</h2>
        <p className="mt-3 text-ink-600 dark:text-mist-400">Tell us your team size and what you're hoping for; we'll come back with a programme and pricing within two working days.</p>
        <div className="mt-8">
          <ContactForm topics={["Corporate wellness"]} />
        </div>
      </Container>
    </div>
  );
}
