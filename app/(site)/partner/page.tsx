import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Partner with HealerJi",
  description: "Wellness centres, studios, institutions and creators — partner with HealerJi to bring certified healing to more people.",
};

export default function PartnerPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Partnerships"
        title="Let's widen the circle."
        lede="Wellness centres and studios, schools and institutions, event organisers, and creators whose communities need what our healers offer — we build partnerships case by case, honestly and in writing. Tell us who you are and what you imagine; a human replies within two working days."
      />
      <Container className="mt-14 max-w-2xl">
        <ContactForm topics={["Partnerships"]} />
      </Container>
    </div>
  );
}
