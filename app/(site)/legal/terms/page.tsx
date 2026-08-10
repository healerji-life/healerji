import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { LegalMeta } from "@/components/legal-meta";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The agreement between you and HealerJi: what the platform is (and isn't), how sessions and payments work, community rules, and both sides' responsibilities.",
};

const sections: { h: string; ps: string[] }[] = [
  { h: "1. The agreement", ps: ["These terms are an agreement between you and Sattveda Wellness Technology Private Limited (\"HealerJi\"), governing healerji.com and the HealerJi app. By creating an account or booking a session you accept them. You must be 18 or older to use HealerJi."] },
  { h: "2. What HealerJi is — and is not", ps: ["HealerJi is a platform that connects you with independent, vetted healing practitioners and hosts related content, community and events. Healers are independent professionals, not our employees; the session itself is between you and them, facilitated by us.", "HealerJi is not a medical, psychological, or emergency service. Practices offered here are traditional and complementary; they do not diagnose, treat or cure any condition, and no outcome is promised by us or permitted to be promised by any healer. For medical or mental-health conditions, consult qualified professionals; in a crisis, call Tele-MANAS 14416 or emergency services 112."] },
  { h: "3. Accounts", ps: ["Keep your account details accurate and your sign-in method to yourself. You're responsible for activity under your account; tell us at once if you believe it's been compromised."] },
  { h: "4. Sessions, payments & refunds", ps: ["Session prices are set by each healer and shown before you book. Payment is collected at booking through Razorpay. Cancellations, rescheduling and refunds follow the Refund & Cancellation Policy, which forms part of these terms."] },
  { h: "5. Community conduct", ps: ["The community guidelines (published on the Community page) form part of these terms. In short: speak from your own experience, keep others' stories confidential, be kind, don't solicit, and escalate any crisis to real-world help. We may remove content or accounts that breach these rules — including healers'."] },
  { h: "6. Healers' obligations", ps: ["Practitioners on HealerJi agree to hold verified certifications for the practices they list, keep client information confidential, make no outcome guarantees, conduct all client sessions through the platform, and follow the community guidelines. Breach can mean removal from the panel."] },
  { h: "7. Content & intellectual property", ps: ["HealerJi's name, logo, design and written content belong to us or our licensors. Content you post remains yours; you grant us a licence to display it on the platform. Don't post content you don't have the right to share."] },
  { h: "8. Liability", ps: ["We provide the platform with care and skill, but to the extent Indian law permits: we are not liable for the acts of independent healers beyond our vetting and moderation obligations, for outcomes of any practice, or for indirect losses. Nothing in these terms limits liability that cannot be limited under Indian law, or your statutory rights as a consumer."] },
  { h: "9. Ending things", ps: ["You can close your account at any time from the app or by writing to support. We may suspend or close accounts that break these terms, with notice except where the breach makes that inappropriate. Clauses that by nature survive (privacy, liability, IP) survive."] },
  { h: "10. Governing law & disputes", ps: ["These terms are governed by the laws of India; courts at New Delhi have jurisdiction, subject to any rights you hold under consumer protection law to proceed elsewhere. Grievances first: support@healerji.com — most things resolve with an honest email."] },
];

export default function TermsPage() {
  return (
    <div className="pb-40">
      <PageIntro eyebrow="Legal" title="Terms of Service." lede="The whole agreement, written to be read. Ten sections, no traps." />
      <Container className="mt-12 max-w-3xl">
        {sections.map((s) => (
          <section key={s.h} className="mt-10 first:mt-0">
            <h2 className="text-2xl">{s.h}</h2>
            {s.ps.map((p, i) => (<p key={i} className="measure mt-4 leading-relaxed text-ink-600 dark:text-mist-400">{p}</p>))}
          </section>
        ))}
        <p className="mt-10 text-ink-600 dark:text-mist-400">
          Read together with the <Link href="/legal/privacy" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">Privacy Policy</Link> and the{" "}
          <Link href="/legal/refunds" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">Refund & Cancellation Policy</Link>.
        </p>
        <LegalMeta />
      </Container>
    </div>
  );
}
