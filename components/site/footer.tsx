import Link from "next/link";
import { Wordmark } from "@/components/site/wordmark";
import { Container } from "@/components/ui/container";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/healers", label: "Find a healer" },
      { href: "/healing", label: "Healing modalities" },
      { href: "/chakras", label: "The chakra map" },
      { href: "/library", label: "The Library" },
      { href: "/practices", label: "Guided practices" },
      { href: "/events", label: "Webinars & workshops" },
      { href: "/stories", label: "Stories" },
      { href: "/pricing", label: "Pricing" },
      { href: "/bookings", label: "Your bookings" },
    ],
  },
  {
    title: "For healers",
    links: [
      { href: "/become-a-healer", label: "Become a healer" },
      { href: "/become-a-healer#earnings", label: "How earnings work" },
      { href: "/partner", label: "Partner programme" },
      { href: "/affiliate", label: "Affiliates" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "Our story & founder" },
      { href: "/for-business", label: "Corporate wellness" },
      { href: "/blog", label: "Journal" },
      { href: "/careers", label: "Careers" },
      { href: "/press", label: "Press" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Trust & legal",
    links: [
      { href: "/trust", label: "How we verify healers" },
      { href: "/trust#privacy", label: "Your privacy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/booking-terms", label: "Booking & payment terms" },
      { href: "/legal/disclaimer", label: "Disclaimers" },
      { href: "/legal/data-retention", label: "Data retention" },
      { href: "/legal/security", label: "Security" },
      { href: "/legal/ip", label: "Intellectual property" },
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/refunds", label: "Refunds & cancellation" },
      { href: "/support", label: "Support centre" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-200/70 bg-surface-50 pb-28 pt-16 dark:border-night-900 dark:bg-night-950 lg:pb-16">
      <Container>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Wordmark variant="lockup" height={72} />
            </div>
            <p className="mt-4 max-w-[28ch] text-sm text-ink-600 dark:text-mist-400">
              Certified healers for emotions, relationships, career, money, and
              health — over chat, audio, or video, in your language.
            </p>
          </div>
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-mist-500">
                {c.title}
              </p>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-600 transition-colors hover:text-ink-900 dark:text-mist-400 dark:hover:text-surface-0"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-surface-200/70 pt-8 text-[13px] leading-relaxed text-mist-500 dark:border-night-900">
          <p className="measure">
            Healing practices on HealerJi complement — and never replace — care
            from qualified medical or mental-health professionals. If you are in
            crisis, please reach a helpline or emergency services first; we list
            them at{" "}
            <Link href="/trust#crisis" className="underline underline-offset-2">
              healerji.com/trust
            </Link>
            .
          </p>
          <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row">
            <p>
              © {new Date().getFullYear()} Sattveda Wellness Technology Private
              Limited · M-5, Essel House, 10 Asaf Ali Road, New Delhi 110002
            </p>
            <p>
              Support:{" "}
              <a href="mailto:support@healerji.com" className="underline underline-offset-2">
                support@healerji.com
              </a>
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
