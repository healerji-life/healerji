import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LibraryBrowser } from "@/components/library-browser";
import { Button } from "@/components/ui/button";
import { listPublishedArticles } from "@/lib/services/articles";
import { toArticles } from "@/lib/services/article-adapter";

export const metadata: Metadata = {
  title: "The Library — guided practices & honest articles",
  description:
    "HealerJi's library of guided practices, healing guides and articles — searchable, saveable, free to read. Audio meditations live in the HealerJi app.",
};

/** DATABASE-BACKED as of pass 4. */
export const revalidate = 300;

export default async function LibraryPage() {
  const result = await listPublishedArticles();
  const articles = result.ok ? toArticles(result.data) : [];

  return (
    <div className="pb-40 pt-44">
      <Container>
        <header className="mb-12 max-w-2xl">
          <h1 className="text-4xl md:text-5xl">The Library.</h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-mist-400">
            Guided practices and honestly-written articles from the HealerJi
            Journal — search, filter, and save what&rsquo;s worth returning to.
            Audio meditations and subliminal tracks live in the HealerJi app,
            where they can play offline.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/practices">Do a guided practice</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/app">Get audio in the app</Link>
            </Button>
          </div>
        </header>

        {articles.length === 0 ? (
          <p className="rounded-md bg-surface-0 p-8 text-ink-600 shadow-e-1 dark:bg-night-900 dark:text-mist-400">
            {result.ok
              ? "The library is being filled. Please come back shortly."
              : "The library is briefly unavailable — please refresh in a moment."}
          </p>
        ) : (
          <LibraryBrowser articles={articles} />
        )}
      </Container>
    </div>
  );
}
