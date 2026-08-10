import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { ArticleCover } from "@/components/article-cover";
import { listPublishedArticles } from "@/lib/services/articles";
import { toArticles } from "@/lib/services/article-adapter";

export const metadata: Metadata = {
  title: "The Journal",
  description:
    "Essays and honest guides from HealerJi — on healing practices, Indian tradition held truthfully, and the inner life of everyday people.",
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/**
 * DATABASE-BACKED as of pass 4.
 *
 * Reads the published_articles view, which is time-aware: a scheduled piece
 * appears when its date arrives, with no cron job. The admin's save actions call
 * revalidatePath("/blog"), so publishing shows here immediately; the window
 * below is only a backstop.
 */
export const revalidate = 300;

export default async function JournalPage() {
  const result = await listPublishedArticles();
  const articles = result.ok ? toArticles(result.data) : [];
  const [lead, ...rest] = articles;

  if (articles.length === 0) {
    return (
      <div className="pb-40 pt-44">
        <Container>
          <header className="max-w-2xl">
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
              The Journal
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl">Writing worth slowing down for.</h1>
            <p className="measure mt-5 text-lg text-ink-600 dark:text-mist-400">
              {result.ok
                ? "The first pieces are being written. Do come back."
                : "The journal is briefly unavailable — please refresh in a moment."}
            </p>
          </header>
        </Container>
      </div>
    );
  }

  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="mb-16 max-w-2xl">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            The Journal
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl">Writing worth slowing down for.</h1>
          <p className="mt-5 text-lg text-ink-600 dark:text-mist-400">
            Tradition held honestly — no miracle promises, no jargon. Just the
            practices, and the people they help.
          </p>
        </header>

        {lead && (
          <Reveal>
            <Link href={`/library/${lead.slug}`} className="group grid gap-10 lg:grid-cols-2 lg:items-center">
              <ArticleCover slug={lead.slug} ratio="aspect-[4/3]" lotusSize={140} />
              <div>
                <p className="inline-flex items-center gap-3 text-[0.8125rem] uppercase tracking-[0.14em] text-mist-500">
                  <span className="rounded-full bg-ink-900/[0.06] px-3 py-1 dark:bg-surface-0/10">
                    {lead.category}
                  </span>
                  {lead.minutes} min read
                </p>
                <h2 className="mt-5 font-display text-3xl transition-colors md:text-4xl">
                  {lead.title}
                </h2>
                <p className="measure mt-4 text-lg text-ink-600 dark:text-mist-400">
                  {lead.standfirst}
                </p>
                <p className="mt-6 text-[0.875rem] text-mist-500">
                  {lead.author} · <time dateTime={lead.published}>{shortDate(lead.published)}</time>
                </p>
              </div>
            </Link>
          </Reveal>
        )}

        <ul className="mt-24 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((a, i) => (
            <Reveal as="li" key={a.slug} delay={(i % 3) * 0.05}>
              <Link href={`/library/${a.slug}`} className="group block">
                <ArticleCover slug={a.slug} />
                <p className="mt-5 inline-flex items-center gap-3 text-[0.8125rem] uppercase tracking-[0.14em] text-mist-500">
                  <span className="rounded-full bg-ink-900/[0.06] px-3 py-1 dark:bg-surface-0/10">
                    {a.category}
                  </span>
                  {a.minutes} min
                </p>
                <h2 className="mt-3 font-display text-xl">{a.title}</h2>
                <p className="mt-2 text-ink-600 dark:text-mist-400">{a.standfirst}</p>
                <p className="mt-4 text-[0.875rem] text-mist-500">
                  <time dateTime={a.published}>{shortDate(a.published)}</time>
                </p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </div>
  );
}
