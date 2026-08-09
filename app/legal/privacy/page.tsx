import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { LegalMeta } from "@/components/legal-meta";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How HealerJi (Sattveda Wellness Technology Private Limited) collects, uses, protects and deletes your personal data, and your rights under India's DPDP Act, 2023.",
};

const sections: { h: string; ps: string[] }[] = [
  { h: "Who we are", ps: ["HealerJi is operated by Sattveda Wellness Technology Private Limited, M-5, Essel House, 10 Asaf Ali Road, New Delhi – 110002, India (\"HealerJi\", \"we\"). This policy explains what personal data we collect on healerji.com and in the HealerJi app, why, and the rights you hold over it — including under the Digital Personal Data Protection Act, 2023 (\"DPDP Act\")."] },
  { h: "What we collect", ps: ["Account data: your name, email address, phone number and language preferences, when you create an account or book a session.", "Session data: bookings you make, the optional note you share with your healer, and reviews you write after completed sessions.", "Wellbeing conversations: what you tell Healy and what you post in the community. We treat this as sensitive by design, whatever its legal classification.", "Payment data: processed entirely by our payment partner Razorpay. HealerJi never receives or stores your card or UPI credentials; we receive only confirmation, amount, and a transaction reference.", "Technical data: device type, app version, and privacy-respecting analytics events (page views, feature usage) used to keep the service working. We do not use this data to build advertising profiles."] },
  { h: "How we use it", ps: ["To provide the service: matching you with healers, delivering sessions, sending booking confirmations and reminders.", "To keep the platform safe: vetting healers, moderating the community, investigating reports, and preventing fraud.", "To improve HealerJi: aggregate, de-identified usage patterns guide what we build.", "We do not sell your personal data, and we do not share your conversations, notes, or community posts with advertisers — full stop."] },
  { h: "Who sees what", ps: ["Your chosen healer sees your name, your booking, and the note you chose to share — nothing else. Healers are bound by confidentiality obligations in their agreement with us.", "Service providers see only what their function requires: Razorpay processes payments; our email provider delivers confirmations; our hosting provider stores data. Each is bound by contract to use data only on our instructions.", "Authorities: we disclose personal data only where Indian law requires it, and we notify you where the law permits."] },
  { h: "Your rights", ps: ["Under the DPDP Act you may: access a summary of your personal data; correct or update it; withdraw consent; ask for erasure of data no longer needed for the purpose it was given; nominate a person to exercise your rights if you are unable to; and raise a grievance.", "To exercise any right, email support@healerji.com with \"Privacy\" in the subject. We respond within the timelines the law prescribes, and if you remain unsatisfied you may complain to the Data Protection Board of India."] },
  { h: "Retention & security", ps: ["We keep personal data only as long as your account is active or as law requires (for example, payment records under tax law), then delete or de-identify it. Data in transit is encrypted; access inside the company is limited to those who need it for their role.", "No system is perfectly secure. If a breach affects your data, we will notify you and the authorities as the DPDP Act requires."] },
  { h: "Children", ps: ["HealerJi is for adults. We do not knowingly offer accounts to persons under 18, and we delete any such account brought to our attention."] },
  { h: "Changes & contact", ps: ["When this policy changes materially, we'll tell you in the app and by email before the change takes effect. Questions and grievances: support@healerji.com, or by post to the registered office above, marked \"Grievance Officer — Privacy\"."] },
];

export default function PrivacyPage() {
  return (
    <div className="pb-40">
      <PageIntro eyebrow="Legal" title="Privacy Policy." lede="Plain language on purpose: what we collect, why, who sees it, and the rights you hold — including under India's DPDP Act, 2023." />
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
