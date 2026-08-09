import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "HealerJi's accessibility commitment: WCAG 2.2 AA as the working standard, reduced-motion support, keyboard navigation, and a direct line for barriers you find.",
};

export default function AccessibilityPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Accessibility"
        title="Healing should have no doorstep."
        lede="This website is built to WCAG 2.2 AA as its working standard, and we treat any barrier you meet as a bug with priority."
      />
      <Container className="mt-12 max-w-2xl space-y-6 text-lg text-ink-600 dark:text-mist-400">
        <p>
          Concretely, that means: every interactive element is reachable and operable by keyboard, with a visible focus ring; a skip-to-content link opens every page; images and decorative animations carry appropriate alternative text or are hidden from assistive technology; colour contrast meets AA in both light and dark themes; forms announce their errors to screen readers; and the entire motion language — every pulse and drift — quiets automatically when your system asks for reduced motion.
        </p>
        <p>
          The interactive chakra explorer, Healy, and the booking flow were designed with assistive technology in mind: each chakra is a labelled button, conversation updates are announced politely, and no step of booking depends on a pointer.
        </p>
        <p>
          We won't claim perfection — accessibility is maintenance, not a milestone. If anything here is hard for you to use, please tell us at{" "}
          <a href="mailto:support@healerji.com" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">support@healerji.com</a>{" "}
          with "Accessibility" in the subject. A human reads it, and barriers get fixed ahead of features.
        </p>
      </Container>
    </div>
  );
}
