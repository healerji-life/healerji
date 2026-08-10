import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Flag, HeartPulse, Lock, Scale } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { FounderNote } from "@/components/founder-note";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description: "How HealerJi vets healers, protects your privacy, moderates its community, keeps its promises honest, and connects anyone in crisis to real human help.",
};

const sections = [
  {
    id: "vetting",
    icon: BadgeCheck,
    t: "How healers are vetted",
    ps: [
      "Every healer on HealerJi applies with their certifications and experience, and then meets our team in a live video conversation before they can list. We're assessing two things: whether they know their practice, and whether they hold people with care and honesty.",
      "Profiles show only what's verified with us — practices, experience, languages. Reviews come exclusively from completed, paid sessions, so a rating can't be manufactured. Healers who make outcome promises, solicit clients privately, or breach confidentiality are removed.",
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    t: "Your privacy",
    ps: [
      "What you share on HealerJi — session notes, Healy conversations, community posts under a withheld name — is treated as among the most sensitive data a platform can hold, because it is.",
      "In practice: session notes go only to your chosen healer; conversations aren't sold or shared with advertisers; payments are processed by Razorpay so card details never touch our systems; and you can ask for your data or its deletion at any time. The full detail, including your rights under India's DPDP Act, is in the privacy policy.",
    ],
    link: { href: "/legal/privacy", label: "Read the privacy policy" },
  },
  {
    id: "honesty",
    icon: Scale,
    t: "Honest claims, honest design",
    ps: [
      "Healing practices on HealerJi are offered as tradition and support — never as medical treatment, and never with guaranteed outcomes. Any healer or page that promises a cure is breaking our rules, and we want to hear about it.",
      "The same honesty governs design: no countdown timers, no fake scarcity, no pre-ticked boxes, no strike-through anchor prices. If our interface ever pressures you, that's a bug — report it.",
    ],
  },
  {
    id: "moderation",
    icon: Flag,
    t: "Community moderation",
    ps: [
      "The community is watched over by a human moderation team. Reports are reviewed, solicitation and unkindness are removed, and the guidelines are enforced evenly — including on healers.",
      "To report anything — a post, a member, a session, this website — use the flag in the app or write to support@healerji.com. Reports about safety are read first.",
    ],
    link: { href: "/community", label: "Read the community guidelines" },
  },
  {
    id: "crisis",
    icon: HeartPulse,
    t: "If you're in crisis",
    ps: [
      "HealerJi is a place for healing, and some pain is bigger than any platform. If you are thinking of harming yourself, or someone is in danger, please reach for immediate human help — you deserve it, today.",
      "Tele-MANAS (Government of India): 14416 or 1-800-891-4416 — free, confidential, 24×7, in multiple Indian languages. Emergency services: 112. Every healer and Healy itself will point you the same way, because that is the only right answer.",
    ],
  },
];

export default function TrustPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Trust & Safety"
        title="Trust is the product."
        lede="A platform that holds people's inner lives has one real asset. Here is exactly how we protect it — vetting, privacy, honesty, moderation, and what happens when someone needs more help than we can give."
      />
      <Container className="mt-14 max-w-3xl">
        <FounderNote className="mb-20">
          &ldquo;People arrive here at their most fragile. Everything we build is
          judged by whether it deserves that.&rdquo;
        </FounderNote>
      </Container>
      <Container className="max-w-3xl space-y-14">
        {sections.map((s, i) => (
          <Reveal as="section" key={s.id} delay={i * 0.03} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
            <div className="flex items-center gap-3">
              <s.icon className="h-5 w-5 text-ink-900 dark:text-surface-0" aria-hidden />
              <h2 id={`${s.id}-h`} className="text-2xl">{s.t}</h2>
            </div>
            {s.ps.map((p, j) => (
              <p key={j} className="measure mt-4 text-lg leading-relaxed text-ink-600 dark:text-mist-400">{p}</p>
            ))}
            {s.link && (
              <p className="mt-4">
                <Link href={s.link.href} className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] transition-colors hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30 dark:hover:decoration-surface-0">{s.link.label} →</Link>
              </p>
            )}
          </Reveal>
        ))}
      </Container>
    </div>
  );
}
