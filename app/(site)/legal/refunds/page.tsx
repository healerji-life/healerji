import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { LegalMeta } from "@/components/legal-meta";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "HealerJi's plain-language rules for cancelling, rescheduling and refunds — for one-to-one sessions and live events.",
};

const sections: { h: string; ps: string[] }[] = [
  { h: "One-to-one sessions", ps: ["Cancel or reschedule up to 24 hours before your session: full refund or free reschedule, your choice.", "Cancel within 24 hours of the start time: one free reschedule; refunds inside this window are at our discretion, because your healer has held that time for you.", "If your healer cancels, or a platform failure on our side prevents the session: full refund or priority reschedule, always, no questions.", "Something went wrong in the session itself? Tell us within 48 hours at support@healerji.com; a human reviews every such report and can refund where warranted."] },
  { h: "Webinars & workshops", ps: ["Paid live events are refundable in full up to 24 hours before start, and when we or the healer cancel or materially change the event. Recordings, where offered, are noted on the event listing."] },
  { h: "How refunds arrive", ps: ["Refunds go back to the original payment method via Razorpay, normally within 5–7 working days of approval (bank timelines vary). We'll confirm by email when it's issued."] },
  { h: "The spirit of this policy", ps: ["This policy exists to be fair to two people at once: you, and a healer whose time is their livelihood. Where the rules above produce an unfair result in a genuine situation, write to us — we reserve the discretion to be kinder than the policy, never harsher."] },
];

export default function RefundsPage() {
  return (
    <div className="pb-40">
      <PageIntro eyebrow="Legal" title="Refunds & cancellations." lede="One page, no fine print: how cancelling, rescheduling and refunds work." />
      <Container className="mt-12 max-w-3xl">
        {sections.map((s) => (
          <section key={s.h} className="mt-10 first:mt-0">
            <h2 className="text-2xl">{s.h}</h2>
            {s.ps.map((p, i) => (<p key={i} className="measure mt-4 leading-relaxed text-ink-600 dark:text-mist-400">{p}</p>))}
          </section>
        ))}
        <LegalMeta />
      </Container>
    </div>
  );
}
