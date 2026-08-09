import type { Article } from "@/lib/content/article";
import type { ArticleRow } from "@/lib/supabase/types";

/**
 * Database row -> the `Article` shape the existing public components render.
 *
 * The same approach as lib/services/healer-adapter.ts: cut the data source over
 * without touching the design system. ArticleCover, LibraryBrowser and the
 * article template keep working exactly as written.
 *
 * `body` maps from body_blocks, the jsonb array of paragraphs the
 * sync_article_body trigger derives from the markdown an editor types. That is
 * why the CMS can accept markdown while the public renderer still receives the
 * string[] it always expected.
 */
export function toArticle(row: ArticleRow): Article {
  return {
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    // The public components display the category as a label; the row stores a
    // slug. Un-slugify for display rather than leaving "energy-healing" on a card.
    category: row.category_slug ? humaniseCategory(row.category_slug) : "Journal",
    pathway: row.pathway ?? "",
    minutes: row.read_minutes,
    // published_at is nullable for drafts, but only published rows reach here.
    published: (row.published_at ?? row.created_at).slice(0, 10),
    author: row.author_name,
    standfirst: row.excerpt,
    body: Array.isArray(row.body_blocks) ? row.body_blocks : [],
  };
}

/** "energy-healing" -> "Energy healing" */
function humaniseCategory(slug: string): string {
  const words = slug.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function toArticles(rows: ArticleRow[]): Article[] {
  return rows.map(toArticle);
}
