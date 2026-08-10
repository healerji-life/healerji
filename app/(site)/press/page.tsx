import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Press & media",
  description: "Facts, brand assets and contacts for journalists covering HealerJi — India's founder-led platform for certified healing.",
};

const facts = [
  ["Company", "Sattveda Wellness Technology Private Limited, New Delhi"],
  ["Platform", "HealerJi — certified healers over chat, audio & video, plus live webinars, workshops, community and the Healy AI assistant"],
  ["Founder", "Dr. Poonam Khetan, Director & CEO — educator of 20+ years; Certified Quantum Reiki Practitioner, NLP Coach, Law of Attraction Expert and Ho'oponopono Healer"],
  ["Leadership", "Ashok Mittal (Chief Mentor & Advisor), Bhupesh Kathuria (CTO), Aashima Mittal (CFO)"],
  ["Model", "Free to join; per-session pricing set by healers; available on the web and the HealerJi app"],
];

export default function PressPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Press"
        title="Writing about HealerJi?"
        lede="Everything a journalist needs on one page — verified facts, brand assets, and a direct line. We respond to press enquiries within one working day."
      />
      <Container className="mt-12 max-w-2xl">
        <dl className="divide-y divide-surface-200 dark:divide-night-900">
          {facts.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]">
              <dt className="text-sm font-medium uppercase tracking-[0.12em] text-mist-500">{k}</dt>
              <dd className="text-ink-600 dark:text-mist-400">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 space-y-3 text-ink-600 dark:text-mist-400">
          <p>
            <span className="font-medium text-ink-900 dark:text-surface-0">Logo:</span>{" "}
            <a href="/brand/full.svg" download className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">full lockup</a>
            {", "}
            <a href="/brand/lockup.svg" download className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">logo &amp; wordmark</a>
            {", "}
            <a href="/brand/mark.svg" download className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">lotus mark</a>
            {" — all SVG, with white versions for dark backgrounds on request. Please don't recolour, crop, or redraw them. Brand colours: #BE3A95 and #4B0E42."}
          </p>
          <p>
            <span className="font-medium text-ink-900 dark:text-surface-0">Founder story:</span>{" "}
            <Link href="/about" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">healerji.com/about</Link>
          </p>
          <p>
            <span className="font-medium text-ink-900 dark:text-surface-0">Press contact:</span>{" "}
            <a href="mailto:support@healerji.com" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">support@healerji.com</a>{" "}
            with "Press" in the subject.
          </p>
        </div>
      </Container>
    </div>
  );
}
