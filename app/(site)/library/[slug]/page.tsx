import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ReadingProgress } from "@/components/reading-progress";
import { ArticleCover } from "@/components/article-cover";
import { getPublishedArticle, listPublishedArticleSlugs } from "@/lib/services/articles";
import { toArticle } from "@/lib/services/article-adapter";
import { pathwayBySlug } from "@/lib/data/pathways";

/**
 * DATABASE-BACKED as of pass 4.
 *
 * Params come from the database at build time; dynamicParams stays on (the
 * default) so a piece published after a deploy still resolves — rendered on
 * demand, then cached.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listPublishedArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedArticle(slug);
  if (!result.ok) return {};
  const a = toArticle(result.data);
  return { title: a.title, description: a.standfirst };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublishedArticle(slug);
  // An unpublished or archived piece is genuinely not found publicly: the view
  // filters it out, so unpublishing in admin removes the page.
  if (!result.ok) notFound();
  const article = toArticle(result.data);
  const pathway = pathwayBySlug(article.pathway);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.standfirst,
    author: { "@type": "Organization", name: article.author },
    datePublished: article.published,
    publisher: { "@type": "Organization", name: "HealerJi" },
  };

  return (
    <div className="pb-40 pt-44">
      <ReadingProgress />
      <Container className="max-w-2xl">
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
          {article.kind === "guide" ? "Guided practice" : "The Journal"} · {article.category} ·{" "}
          {article.minutes} min read
        </p>
        <h1 className="mt-4 text-3xl md:text-5xl">{article.title}</h1>
        <p className="mt-5 font-display text-xl text-ink-600 dark:text-mist-400">
          {article.standfirst}
        </p>
        <p className="mt-6 text-[0.875rem] text-mist-500">
          {article.author} ·{" "}
          <time dateTime={article.published}>
            {new Date(article.published).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </time>
        </p>
        <ArticleCover slug={article.slug} className="mt-10" ratio="aspect-[16/9]" lotusSize={120} />
        <div className="mt-12 space-y-6">
          {article.body.map((p, i) => (
            <p key={i} className="measure text-lg leading-relaxed text-ink-600 dark:text-mist-400">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap gap-4 border-t border-surface-200 pt-8 dark:border-night-900">
          {pathway && (
            <Button asChild>
              <Link href={`/paths/${pathway.slug}`}>Explore the {pathway.name} pathway</Link>
            </Button>
          )}
          <Button variant="secondary" asChild>
            <Link href="/library">Back to the Library</Link>
          </Button>
        </div>
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
