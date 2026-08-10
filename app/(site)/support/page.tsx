import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Support centre",
  description: "Help with bookings, payments, your account, healers, and safety on HealerJi — plus how to reach a human.",
};

const topics = [
  { t: "Bookings & sessions", d: "How booking works, joining a session, rescheduling, and what happens if a healer can't make it.", links: [{ href: "/book", l: "How booking works" }, { href: "/legal/refunds", l: "Cancellations & refunds" }] },
  { t: "Payments", d: "Payments are handled by Razorpay; HealerJi never stores your card details. Receipts arrive by email after every session.", links: [{ href: "/pricing", l: "How pricing works" }, { href: "/legal/refunds", l: "Refund policy" }] },
  { t: "Your account & privacy", d: "Signing in, updating your details, and how your conversations and notes are protected.", links: [{ href: "/signin", l: "Sign in" }, { href: "/legal/privacy", l: "Privacy policy" }] },
  { t: "Healers & quality", d: "How the panel is vetted, how reviews work, and how to raise a concern about a session.", links: [{ href: "/trust", l: "Trust & safety" }, { href: "/become-a-healer", l: "Join the panel" }] },
  { t: "Community & safety", d: "Community guidelines, reporting a post or member, and crisis resources.", links: [{ href: "/community", l: "Community guidelines" }, { href: "/trust", l: "Crisis resources" }] },
];

export default function SupportPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Support centre"
        title="How can we help?"
        lede="Start with a topic below — and if it doesn't answer you, a human will."
      />
      <Container className="mt-14">
        <ul className="grid gap-5 md:grid-cols-2">
          {topics.map((t) => (
            <SpotlightCard as="li" key={t.t} className="rounded-md bg-surface-0 p-7 shadow-e-1 dark:bg-night-900">
              <h2 className="font-display text-xl">{t.t}</h2>
              <p className="mt-2 text-ink-600 dark:text-mist-400">{t.d}</p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {t.links.map((l) => (
                  <Link key={l.href + l.l} href={l.href} className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] transition-colors hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30 dark:hover:decoration-surface-0">{l.l} →</Link>
                ))}
              </p>
            </SpotlightCard>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-md bg-plum-900 p-8 text-surface-0">
          <p className="flex-1 text-lg">Didn't find it? Open a ticket — we reply within a working day.</p>
          <Button variant="accent" asChild><Link href="/contact">Contact support</Link></Button>
        </div>
      </Container>
    </div>
  );
}
