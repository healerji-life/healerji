import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { AvatarArt } from "@/components/ui/avatar-art";
import { Button } from "@/components/ui/button";
import { testimonials } from "@/lib/data/testimonials";
import { pathBySlug } from "@/lib/data/paths";

export const metadata: Metadata = {
  title: "Stories from the community",
  description: "What people say after their HealerJi sessions — in their own words, in their own language. Where someone chose privacy, we say so.",
};

export default function StoriesPage() {
  return (
    <div className="pb-40">
      <PageIntro
        eyebrow="Stories"
        title="In their own words. In their own language."
        lede="Shared by people after their sessions. Hinglish stays Hinglish — that's how healing actually sounds here — and where someone preferred privacy, we say so instead of inventing a face. Sharing your own journey is welcome too; many people find it part of the healing."
      />
      <Container className="mt-14">
        <ul className="grid gap-5 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal as="li" key={i} delay={(i % 2) * 0.05}>
              <figure className="flex h-full flex-col justify-between rounded-md bg-surface-0 p-7 shadow-e-1 dark:bg-night-900">
                <blockquote className="font-display text-lg leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  {t.anonymous ? (
                    <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-200 text-mist-500">—</span>
                  ) : (
                    <AvatarArt name={t.name} size={44} />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.anonymous ? "Name withheld for privacy" : t.name}</p>
                    <p className="text-[13px] text-mist-500">After sessions in {pathBySlug(t.path)?.name}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-md bg-surface-100 p-8 dark:bg-night-900">
          <p className="flex-1 text-lg text-ink-600 dark:text-mist-400">Have a story of your own? Share it in the community — on your terms, named or not.</p>
          <Button asChild><Link href="/community">Share your story</Link></Button>
        </div>
      </Container>
    </div>
  );
}
