import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Careers",
  description: "Work at HealerJi — a founder-led team in New Delhi building India's trusted home for certified healing.",
};

export default function CareersPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Careers"
        title="Build the calmest company in India."
        lede="We're a small founder-led team in New Delhi — educators, engineers, finance people and healers — building the platform we wished existed. We hire slowly and deliberately."
      />
      <Container className="mt-12 max-w-2xl space-y-6 text-lg text-ink-600 dark:text-mist-400">
        <p>
          There are no open roles listed right now — and we'd rather tell you
          that plainly than post evergreen listings nobody reads. When roles
          open, they appear here first.
        </p>
        <p>
          That said: exceptional people don't always arrive on schedule. If you
          believe you belong here — engineering, healer operations, content,
          community — write to{" "}
          <a href="mailto:support@healerji.com" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">support@healerji.com</a>{" "}
          with "Careers" in the subject and the honest version of why. Every
          such email is read by a founder.
        </p>
      </Container>
    </div>
  );
}
