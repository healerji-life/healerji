import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { LegalMeta } from "@/components/legal-meta";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The short, honest list of cookies and similar technologies healerji.com uses — and what we deliberately don't.",
};

export default function CookiesPage() {
  return (
    <div className="pb-40">
      <PageIntro eyebrow="Legal" title="Cookies." lede="This is a short policy, because we use few cookies — deliberately." />
      <Container className="mt-12 max-w-3xl space-y-6 text-lg leading-relaxed text-ink-600 dark:text-mist-400">
        <p><strong className="text-ink-900 dark:text-surface-0">Strictly necessary:</strong> cookies that keep you signed in, remember your theme (light/dark) and language, and secure forms against abuse. These are required for the site to function and can't be switched off individually.</p>
        <p><strong className="text-ink-900 dark:text-surface-0">Analytics:</strong> privacy-respecting, aggregate measurements of which pages are used, so we know what to improve. These never build an advertising profile of you.</p>
        <p><strong className="text-ink-900 dark:text-surface-0">Payments:</strong> when you pay, Razorpay sets cookies needed to complete the transaction securely, governed by Razorpay's own policy.</p>
        <p><strong className="text-ink-900 dark:text-surface-0">What we don't do:</strong> no third-party advertising cookies, no cross-site trackers, no selling of browsing data. Said plainly: your inner life is not our inventory.</p>
        <p>Your browser lets you clear or block cookies at any time; blocking the strictly-necessary ones may break sign-in. Questions: <a href="mailto:support@healerji.com" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">support@healerji.com</a>, and the wider picture is in our <Link href="/legal/privacy" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30">Privacy Policy</Link>.</p>
        <LegalMeta />
      </Container>
    </div>
  );
}
