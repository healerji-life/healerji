/**
 * The public `Article` shape.
 *
 * Moved here from lib/data/articles.ts in pass 4, once that module had zero
 * remaining data consumers. Keeping the type in the legacy data file meant every
 * database-backed component still imported from a file full of hard-coded
 * content, which read as though the cutover hadn't happened.
 *
 * lib/data/articles.ts re-exports this so nothing external breaks.
 */
export interface Article {
  slug: string;
  title: string;
  kind: "article" | "guide" | "story";
  category: string;
  pathway: string;
  minutes: number;
  /** ISO date the piece was published */
  published: string;
  author: string;
  standfirst: string;
  body: string[];
}
