import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Write to the HealerJi team — support, healer applications, partnerships, press. We reply by email, usually within a working day.",
};

export default function ContactPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Contact"
        title="Write to us — a person reads it."
        lede="Support questions, booking help, partnerships, press: one form reaches the right desk. We reply by email, usually within a working day."
      />
      <Container className="mt-14 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm topics={["Support & bookings", "Become a healer", "Corporate wellness", "Partnerships", "Press", "Something else"]} />
        <aside className="space-y-6 text-ink-600 dark:text-mist-400">
          <div>
            <p className="font-medium text-ink-900 dark:text-surface-0">Email</p>
            <a href="mailto:support@healerji.com" className="underline underline-offset-2">support@healerji.com</a>
          </div>
          <div>
            <p className="font-medium text-ink-900 dark:text-surface-0">Registered office</p>
            <p>Sattveda Wellness Technology Private Limited<br />M-5, Essel House, 10 Asaf Ali Road,<br />New Delhi – 110002, India</p>
          </div>
          <div>
            <p className="font-medium text-ink-900 dark:text-surface-0">In-app help</p>
            <p>The fastest route for account and session issues is the support section inside the HealerJi app.</p>
          </div>
        </aside>
      </Container>
    </div>
  );
}
