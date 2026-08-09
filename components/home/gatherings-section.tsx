import Link from "next/link";
import { Radio, Users, Video } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";

/**
 * Events & community — the parts of HealerJi that happen together.
 * No invented event listings: the live calendar renders from the
 * platform; this section states what truly exists (live webinars,
 * workshops, a moderated community) and routes to it.
 */
const gatherings = [
  {
    icon: Radio,
    title: "Live webinars",
    body: "Healers teaching in real time — breathwork, chakra practice, Law of Attraction — with room for your questions at the end.",
    href: "/events",
    cta: "See the calendar",
  },
  {
    icon: Video,
    title: "Workshops",
    body: "Deeper, smaller sessions on a single practice, led live by certified healers from the HealerJi panel.",
    href: "/events",
    cta: "Browse workshops",
  },
  {
    icon: Users,
    title: "Community",
    body: "A moderated space to share your story and hear others' — because healing rarely happens entirely alone.",
    href: "/community",
    cta: "Step inside",
  },
];

export function GatheringsSection() {
  return (
    <section className="py-32 md:py-52" aria-labelledby="gatherings-heading">
      <Container>
        <SectionHeading
          id="gatherings-heading"
          eyebrow="Together, not just one-to-one"
          title="Webinars, workshops, and a community that cares."
          lede="Some healing happens in a private session. Some happens in a room full of people discovering they aren't the only one."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {gatherings.map((g, i) => (
            <Reveal key={g.title} delay={i * 0.06}>
              <article className="flex h-full flex-col rounded-md border border-surface-200 p-8 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2 dark:border-night-900">
                <g.icon className="h-5 w-5 text-ink-900 dark:text-surface-0" aria-hidden />
                <h3 className="mt-4 font-display text-xl">{g.title}</h3>
                <p className="mt-3 flex-1 text-ink-600 dark:text-mist-400">{g.body}</p>
                <Button variant="tertiary" className="mt-5 self-start px-0" asChild>
                  <Link href={g.href}>{g.cta} →</Link>
                </Button>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
