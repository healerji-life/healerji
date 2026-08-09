import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing — free to join, pay per session",
  description: "HealerJi is free to join. Each healer sets their session price, shown on their profile before you book — no subscriptions required, no hidden fees.",
};

const truths = [
  "Joining, browsing healers, Healy's guidance, and the written Library are free.",
  "Each healer sets their own session price — always shown on their profile and again before you pay.",
  "You pay per session, by UPI or card, through Razorpay. GST is included in the price you see.",
  "No subscription is required for one-to-one sessions. Webinars and workshops show their own price (many are free).",
  "Cancellations and refunds follow one plain-language policy, linked before every payment.",
];

export default function PricingPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Pricing"
        title="Free to join. Pay only for sessions."
        lede="No paywall in front of finding help, no fine print behind it. Here is the entire pricing model, in five sentences."
      />
      <Container className="mt-12 max-w-2xl">
        <ul className="space-y-4">
          {truths.map((t) => (
            <li key={t} className="flex gap-3 text-lg text-ink-600 dark:text-mist-400">
              <Check className="mt-1.5 h-4 w-4 shrink-0 text-mist-500" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-10 rounded-md bg-surface-100 p-5 text-sm text-ink-600 dark:bg-night-900 dark:text-mist-400">
          Full detail lives in the{" "}
          <Link href="/legal/refunds" className="underline underline-offset-2">refund & pricing policy</Link>.
          No false urgency, no strike-through anchor prices, no pre-ticked anything — that's a promise, and it's also{" "}
          <Link href="/trust" className="underline underline-offset-2">policy</Link>.
        </p>
        <div className="mt-10 flex gap-4">
          <Button size="lg" asChild><Link href="/healers">See healers & their prices</Link></Button>
        </div>
      </Container>
    </div>
  );
}
