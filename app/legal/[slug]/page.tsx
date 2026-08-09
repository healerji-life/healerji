import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/page-intro";
import { legalDocs, legalBySlug } from "@/lib/data/legal";
import { LegalMeta } from "@/components/legal-meta";

export function generateStaticParams() {
  return legalDocs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = legalBySlug(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = legalBySlug(slug);
  if (!doc) notFound();

  return (
    <div className="pb-40">
      <PageIntro eyebrow={doc.eyebrow} title={doc.title} lede={doc.lede} />
      <Container className="mt-16 max-w-3xl">
        {/* On this page */}
        <nav aria-label="Sections" className="mb-16 border-y border-ink-900/10 py-6 dark:border-surface-0/10">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
            {doc.sections.map((s) => (
              <li key={s.h}>
                <a
                  href={`#${s.h.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="text-ink-600 underline decoration-ink-900/20 underline-offset-[5px] hover:decoration-ink-900 dark:text-mist-400 dark:decoration-surface-0/25"
                >
                  {s.h}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {doc.sections.map((s) => (
          <section
            key={s.h}
            id={s.h.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
            className="mt-14 scroll-mt-28 first:mt-0"
          >
            <h2 className="text-2xl">{s.h}</h2>
            {s.ps.map((p, i) => (
              <p key={i} className="measure mt-4 leading-relaxed text-ink-600 dark:text-mist-400">
                {p}
              </p>
            ))}
          </section>
        ))}

        {doc.seeAlso && (
          <p className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-900/10 pt-8 text-[0.9375rem] dark:border-surface-0/10">
            {doc.seeAlso.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] hover:decoration-ink-900 dark:text-surface-0 dark:decoration-surface-0/30"
              >
                {l.label} →
              </Link>
            ))}
          </p>
        )}

        <LegalMeta />
      </Container>
    </div>
  );
}
