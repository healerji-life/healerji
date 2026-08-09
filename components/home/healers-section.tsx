import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/reveal";
import { HealerCard } from "@/components/healer-card";
import { Button } from "@/components/ui/button";
import { listPublicHealersForSite } from "@/lib/services/healers";
import { TiltedCard } from "@/components/motion/tilted-card";

/**
 * DATABASE-BACKED as of pass 2. An async server component: marking a healer
 * "Featured" in the admin portal changes who appears here, with no redeploy.
 */
export async function HealersSection() {
  const result = await listPublicHealersForSite({ featured: true });
  const healers = result.ok ? result.data : [];
  if (healers.length === 0) return null;

  return (
    <section className="py-32 md:py-52" aria-labelledby="healers-heading">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="healers-heading"
            eyebrow="Certified, and shown — not just claimed"
            title="Meet the healers."
            lede="HealerJi's panel is made of certified healers across Reiki, chakra work, inner-child healing, breathwork and more. Every profile shows their practices, languages, and experience before you book."
            className="mb-0"
          />
          <Button variant="secondary" asChild>
            <Link href="/healers">Browse all healers</Link>
          </Button>
        </div>
        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {healers.slice(0, 3).map((h, i) => (
            <Reveal as="li" key={h.slug} delay={i * 0.06}>
              <TiltedCard max={3}>
                <HealerCard healer={h} />
              </TiltedCard>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
