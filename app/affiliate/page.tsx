import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Affiliates & creators",
  description: "Recommend HealerJi to your audience with full disclosure and honest framing — apply to the affiliate programme.",
};

export default function AffiliatePage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Affiliates"
        title="Recommend us the way we'd want to be recommended."
        lede="If your audience trusts you with their inner life, we'd like to earn a place in that trust — honestly. Our affiliate programme follows two non-negotiables: full disclosure on every promotion (per ASCI guidelines), and no outcome promises, ever. If that matches how you work, apply below and we'll share terms in writing."
      />
      <Container className="mt-14 max-w-2xl">
        <ContactForm topics={["Partnerships"]} />
      </Container>
    </div>
  );
}
