/**
 * Legal & trust content.
 *
 * Written as plain-language drafts for HealerJi (Sattveda Wellness
 * Technology Private Limited) and structured against India's DPDP Act,
 * 2023 and the DPDP Rules, 2025 — under which full substantive
 * compliance (notice, consent, security safeguards, breach reporting,
 * data-principal rights) is due by 13 May 2027, with the Consent
 * Manager framework switching on 13 November 2026.
 *
 * These are DRAFTS FOR COUNSEL REVIEW, not legal advice, and every
 * page says so plainly. Effective dates are set on sign-off.
 */
export interface LegalSection {
  h: string;
  ps: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  eyebrow: string;
  lede: string;
  description: string;
  sections: LegalSection[];
  /** cross-references shown at the foot */
  seeAlso?: { href: string; label: string }[];
}

const GRIEVANCE =
  "Grievance Officer, Sattveda Wellness Technology Private Limited, M-5, Essel House, 10 Asaf Ali Road, New Delhi – 110002. Email: support@healerji.com with \u201cGrievance\u201d in the subject line. We acknowledge within 48 hours and resolve within the timelines the law prescribes; the DPDP framework allows a Data Fiduciary a maximum of 90 days to answer a data-principal request, and we aim to be considerably faster.";

export const legalDocs: LegalDoc[] = [
  {
    slug: "disclaimer",
    title: "Disclaimers",
    eyebrow: "Legal",
    lede: "The most important page on this website: what HealerJi is, what it is not, and what no healer here may ever promise you.",
    description:
      "HealerJi's wellness, medical and AI disclaimers — what our practices are, what they are not, and when to seek qualified professional care.",
    sections: [
      {
        h: "Medical disclaimer",
        ps: [
          "HealerJi is not a medical service. Nothing on this website or in the HealerJi app — no session, article, guided practice, seed sound, chakra description or AI conversation — constitutes medical advice, diagnosis, or treatment, and none of it is a substitute for consulting a registered medical practitioner.",
          "Never disregard professional medical advice, delay seeking it, or discontinue prescribed treatment because of something you read or heard here. If you have or suspect a medical condition, consult a qualified doctor. In an emergency, call 112 immediately.",
          "Practices offered on HealerJi are complementary traditions. They are not claimed to cure, treat, mitigate or prevent any disease or disorder, and any such claim would in any case be prohibited under the Drugs and Magic Remedies (Objectionable Advertisements) Act, 1954. Healers who make outcome guarantees are removed from the panel.",
        ],
      },
      {
        h: "Wellness & session disclaimer",
        ps: [
          "Healers on HealerJi are independent practitioners offering traditional and complementary wellness practices. They are not doctors, psychologists, psychiatrists, or licensed therapists by virtue of being on this platform, and they do not present themselves as such.",
          "Individual experience varies. No specific result, timeline, or outcome is promised by HealerJi or by any healer, and testimonials describe personal experience rather than typical results.",
          "Before your first session you will be asked to acknowledge these terms. That acknowledgement is not a formality — it is the moment we make sure you know what you are booking, and what you are not.",
        ],
      },
      {
        h: "Mental health & crisis",
        ps: [
          "HealerJi is not a crisis service and cannot respond to emergencies. If you are thinking of harming yourself, or someone is in danger, please contact Tele-MANAS at 14416 or 1-800-891-4416 (free, confidential, 24×7, Government of India, in multiple Indian languages), or emergency services at 112.",
          "Our healers and Healy will point you the same way, every time, because that is the only right answer. It is not a deflection; it is care.",
        ],
      },
      {
        h: "AI assistant disclaimer",
        ps: [
          "Healy is an artificial-intelligence assistant. It is not a healer, therapist, doctor, or human being, and it will tell you so. It offers orientation, traditional practice suggestions, and navigation of the platform.",
          "AI can be wrong. Healy's suggestions are not professional advice of any kind — medical, psychological, legal or financial — and should not be relied upon as such. Verify anything consequential with a qualified human.",
          "Conversations with Healy are treated as sensitive personal data under our privacy policy. They are not shared with healers without your instruction, and they are never used to pressure you into a booking.",
        ],
      },
      {
        h: "Content & external links",
        ps: [
          "Articles, guided practices and chakra material on HealerJi describe traditions as they are taught and experienced, alongside honest notes about their limits. They are educational and reflective in purpose.",
          "Sound frequencies offered with the seed sounds are reference tones used in contemporary sound practice. They are offered as an aid to attention, with no therapeutic claim attached.",
          "Where we link to external services — app stores, payment providers, government helplines — those services are governed by their own terms, over which we have no control.",
        ],
      },
    ],
    seeAlso: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/trust", label: "Trust & Safety" },
    ],
  },
  {
    slug: "booking-terms",
    title: "Booking & Payment Terms",
    eyebrow: "Legal",
    lede: "What happens when you book: what you're agreeing to, how payment works, and exactly what you may expect from us and from your healer.",
    description:
      "HealerJi's booking and payment terms — session agreements, Razorpay payment disclosures, pricing, GST, and what both sides commit to.",
    sections: [
      {
        h: "What a booking is",
        ps: [
          "A booking is an agreement for a session between you and an independent healer, arranged and facilitated through HealerJi. You must be 18 or older to book. The session type, length and price are shown before you pay, and again on the review screen.",
          "Before confirming, you acknowledge the wellness and medical disclaimers, and consent to your optional note being shared with your chosen healer alone.",
        ],
      },
      {
        h: "Payments & Razorpay",
        ps: [
          "Payments are processed by Razorpay Software Private Limited, an RBI-authorised payment aggregator. When you pay, you are redirected to Razorpay's secure checkout; your card, UPI or net-banking credentials are entered there and are never received, seen or stored by HealerJi. We receive only a transaction reference, the amount, and its status.",
          "Prices are shown in Indian Rupees and are inclusive of applicable GST. A tax invoice and receipt are emailed after a successful payment. Your bank or UPI provider may apply its own terms; any bank-side charges are outside our control.",
          "If a payment fails, no amount is captured, and you may retry immediately. If an amount is debited without a confirmed booking, it is auto-reversed by your bank — normally within 5–7 working days — and you should write to support@healerji.com with the transaction reference so we can follow it for you.",
        ],
      },
      {
        h: "Attendance, lateness & no-shows",
        ps: [
          "Please join at the scheduled time. Healers hold the full session length for you; where you join late, the session still ends at its scheduled time so the healer's next client is not affected.",
          "If your healer does not appear within ten minutes of the start time, you are entitled to a full refund or a priority reschedule, at your choice — write to support@healerji.com and we will arrange it without argument.",
        ],
      },
      {
        h: "Changes, cancellations & refunds",
        ps: [
          "Cancellations, rescheduling and refunds are governed by the Refund & Cancellation Policy, which forms part of these terms and is linked before every payment.",
          "We reserve the right to cancel a booking where a healer becomes unavailable, where fraud is suspected, or where a booking breaches these terms. Where we cancel and you are not at fault, you receive a full refund.",
        ],
      },
      {
        h: "Recording & confidentiality",
        ps: [
          "Sessions are not recorded by HealerJi. Neither you nor your healer may record a session without the other's explicit, prior consent. Healers are bound by confidentiality obligations in their agreement with us; breaching them ends their place on the panel.",
        ],
      },
    ],
    seeAlso: [
      { href: "/legal/refunds", label: "Refund & Cancellation Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/disclaimer", label: "Disclaimers" },
    ],
  },
  {
    slug: "data-retention",
    title: "Data Retention Policy",
    eyebrow: "Legal",
    lede: "How long we keep what, and what happens when a purpose ends — the operational half of our privacy promise.",
    description:
      "How long HealerJi retains each category of personal data, when it is erased, and how to request erasure under the DPDP Act.",
    sections: [
      {
        h: "The principle",
        ps: [
          "Personal data is erased once the purpose it was given for is no longer being served — because you withdrew consent, because the purpose was fulfilled, or because you have not used HealerJi for the period below. This mirrors the erasure framework of the DPDP Act, 2023 and the DPDP Rules, 2025.",
        ],
      },
      {
        h: "How long we keep things",
        ps: [
          "Account details (name, email, phone, language preference): for as long as your account is active, and for 12 months after your last use, after which the account and its data are erased or de-identified. We notify you before erasure so you can keep the account if you wish.",
          "Session notes you share with a healer: retained for the session and for 12 months afterwards so that continuing work with the same healer has context; erased earlier on request.",
          "Healy conversations: retained for 12 months to maintain continuity, and erased earlier on request. They are never used to target advertising, because we do not run advertising.",
          "Payment records: retained for eight financial years as required by Indian tax and companies legislation. This is a legal obligation and survives an erasure request; we retain the transaction record, never your card details, which we never hold in the first place.",
          "Security and access logs: retained for one year, as the DPDP Rules require for traceability and breach investigation.",
          "Community posts: retained while your account is active; deleted on request, though quoted excerpts in others' replies may persist where removing them would distort another person's contribution.",
        ],
      },
      {
        h: "Asking us to erase",
        ps: [
          "Write to support@healerji.com with \u201cErasure\u201d in the subject line, or use the in-app privacy controls. We confirm what will be erased, what must be retained by law and why, and complete the erasure within the statutory timeline.",
          GRIEVANCE,
        ],
      },
    ],
    seeAlso: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/security", label: "Security" },
    ],
  },
  {
    slug: "security",
    title: "Security",
    eyebrow: "Trust",
    lede: "The safeguards behind a platform that holds people's inner lives — stated plainly, without security theatre.",
    description:
      "How HealerJi protects your data: encryption in transit, access control, payment isolation, breach response and responsible disclosure.",
    sections: [
      {
        h: "In transit and at rest",
        ps: [
          "Every connection to healerji.com and the HealerJi app is encrypted with TLS; the site is served over HTTPS with HSTS, and modern browsers will refuse an unencrypted connection. Data stored by our infrastructure providers is encrypted at rest.",
        ],
      },
      {
        h: "Payment isolation",
        ps: [
          "Card, UPI and net-banking credentials are handled entirely by Razorpay, an RBI-authorised payment aggregator operating to PCI-DSS requirements. Those credentials never traverse or rest on HealerJi's systems, which is the strongest guarantee available: we cannot leak what we never hold.",
        ],
      },
      {
        h: "Access control",
        ps: [
          "Access to personal data inside the company is limited to those whose role requires it, authenticated individually, and logged. Healers see only their own clients' bookings and the notes those clients chose to share.",
        ],
      },
      {
        h: "If something goes wrong",
        ps: [
          "No system is perfectly secure, and any company claiming otherwise is selling something. If a breach affects your personal data, we will notify the Data Protection Board of India and affected users within the timelines the DPDP Rules require, with a plain-language description of what happened, what data was involved, what we are doing, and what you can do.",
        ],
      },
      {
        h: "Responsible disclosure",
        ps: [
          "If you find a vulnerability, please tell us at support@healerji.com with \u201cSecurity\u201d in the subject line before disclosing it publicly. We will acknowledge within 48 hours, keep you updated, and will not pursue action against good-faith researchers who avoid privacy violations, data destruction and service disruption.",
        ],
      },
    ],
    seeAlso: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/data-retention", label: "Data Retention" },
    ],
  },
  {
    slug: "ip",
    title: "Intellectual Property & Copyright",
    eyebrow: "Legal",
    lede: "Who owns what on HealerJi — ours, yours, and the traditions that belong to everyone.",
    description:
      "HealerJi's intellectual property notice: brand and content ownership, your rights over what you post, and how to report infringement.",
    sections: [
      {
        h: "Ours",
        ps: [
          "The HealerJi name, the lotus mark, the wordmark, the visual identity, and the original written and visual content of this website and the HealerJi app are the property of Sattveda Wellness Technology Private Limited or its licensors, protected under the Copyright Act, 1957 and the Trade Marks Act, 1999.",
          "You may read, share links to, and quote briefly from our content with attribution. You may not reproduce it wholesale, republish it, or use our marks in a way that suggests endorsement or affiliation without written permission.",
        ],
      },
      {
        h: "Yours",
        ps: [
          "What you write — community posts, reviews, session notes — remains yours. By posting publicly on HealerJi you grant us a non-exclusive, royalty-free licence to display, store and distribute that content on the platform for as long as you choose to keep it there.",
          "We do not sell your content, license it to third parties, or use it in advertising without your specific permission.",
        ],
      },
      {
        h: "Healers' material",
        ps: [
          "Healers retain the rights to their own teaching material, recordings and written work. Listing on HealerJi grants us only the licence needed to display their profile and deliver their sessions.",
        ],
      },
      {
        h: "The traditions themselves",
        ps: [
          "Reiki, Ho'oponopono, the chakra system, Swar Vigyan and the other practices described here belong to living traditions and to no company. We claim no ownership over them. What we claim is our own expression of them: our words, our illustrations, our software.",
        ],
      },
      {
        h: "Reporting infringement",
        ps: [
          "If you believe content on HealerJi infringes your rights, write to support@healerji.com with \u201cIP notice\u201d in the subject line, identifying the work, the location of the material, and your contact details. We act on valid notices promptly under the Information Technology Act, 2000 and its intermediary rules.",
        ],
      },
    ],
    seeAlso: [{ href: "/legal/terms", label: "Terms of Service" }],
  },
];

export const legalBySlug = (slug: string) => legalDocs.find((d) => d.slug === slug);

export const GRIEVANCE_TEXT = GRIEVANCE;
