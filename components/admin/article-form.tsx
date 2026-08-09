"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ArticleFormState } from "@/lib/actions/articles";
import type { ArticleRow } from "@/lib/supabase/types";
import { Fieldset, Field, TextArea, Select, Toggle, SubmitButton, FormMessage } from "@/components/admin/form";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import { UPLOAD_FOLDERS_PUBLIC } from "@/components/admin/upload-folders";

type Action = (state: ArticleFormState, formData: FormData) => Promise<ArticleFormState>;

/** datetime-local wants "YYYY-MM-DDTHH:MM" in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ArticleForm({
  action, article, categories, submitLabel, cloudinaryConfigured,
}: {
  action: Action;
  article?: ArticleRow;
  categories: { value: string; label: string }[];
  submitLabel: string;
  cloudinaryConfigured: boolean;
}) {
  const [state, formAction] = useActionState<ArticleFormState, FormData>(action, {});
  const [status, setStatus] = useState(article?.status ?? "draft");
  const error = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-4">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}

      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <div className="rounded-lg bg-white shadow-e-1 dark:bg-night-900">
        <Fieldset legend="The piece" description="Title, address and the body.">
          <Field
            label="Title" name="title" required span
            defaultValue={article?.title}
            {...(error("title") ? { error: error("title") } : {})}
          />
          <Field
            label="URL slug" name="slug"
            defaultValue={article?.slug}
            hint={article ? `Currently /blog/${article.slug}` : "Generated from the title when left blank."}
            {...(error("slug") ? { error: error("slug") } : {})}
          />
          <Select
            label="Kind" name="kind"
            defaultValue={article?.kind ?? "article"}
            options={[
              { value: "article", label: "Article" },
              { value: "guide", label: "Guide — also a practice" },
              { value: "story", label: "Story" },
            ]}
          />
          <TextArea
            label="Excerpt" name="excerpt" rows={3} maxLength={400}
            defaultValue={article?.excerpt}
            hint="The standfirst shown on cards and in search results."
          />
          <MarkdownEditor
            label="Body"
            name="bodyMarkdown"
            defaultValue={article?.body_markdown ?? ""}
          />
        </Fieldset>

        <Fieldset legend="Cover image" description="Shown at the top of the article and on cards." columns={1}>
          <ImageUpload
            label="Cover"
            name="coverUrl"
            altName="coverAlt"
            initialUrl={article?.cover_url ?? null}
            initialAlt={article?.cover_alt ?? null}
            folder={UPLOAD_FOLDERS_PUBLIC.articles}
            configured={cloudinaryConfigured}
          />
        </Fieldset>

        <Fieldset legend="Filing" description="How readers find it.">
          <Select
            label="Category" name="categorySlug"
            defaultValue={article?.category_slug ?? ""}
            options={[{ value: "", label: "No category" }, ...categories]}
          />
          <Field
            label="Pathway" name="pathway"
            defaultValue={article?.pathway ?? ""}
            hint="e.g. energy-healing, stress-anxiety"
          />
          <Field
            label="Author" name="authorName"
            defaultValue={article?.author_name ?? "The HealerJi Journal"}
          />
          <Field
            label="Read time (minutes)" name="readMinutes" type="number" min={1} max={120}
            defaultValue={article?.read_minutes ?? 5}
          />
          <Field
            label="Tags" name="tags" span
            defaultValue={(article?.tags ?? []).join(", ")}
            hint="Comma separated."
          />
          <Toggle
            label="Featured" name="featured"
            defaultChecked={article?.featured ?? false}
            hint="Featured pieces lead the journal."
          />
        </Fieldset>

        <Fieldset legend="Publication" description="Draft is invisible. Scheduled appears automatically at its time.">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Status</span>
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleRow["status"])}
              className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            >
              <option value="draft">Draft — not public</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Publication date
              {status === "scheduled" ? <span aria-hidden className="text-orchid-500"> *</span> : null}
            </span>
            <input
              type="datetime-local"
              name="publishedAt"
              defaultValue={toLocalInput(article?.published_at ?? null)}
              onChange={() => undefined}
              className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            />
            <span className="mt-1 block text-xs text-mist-500">
              Leave blank when publishing now.
            </span>
            {error("publishedAt") ? (
              <span className="mt-1 block text-xs text-error-700">{error("publishedAt")}</span>
            ) : null}
          </label>
        </Fieldset>

        <Fieldset legend="Search engines" description="Falls back to the title and excerpt when blank.">
          <Field label="SEO title" name="seoTitle" maxLength={70} defaultValue={article?.seo_title ?? ""} />
          <Field label="SEO description" name="seoDescription" maxLength={180} defaultValue={article?.seo_description ?? ""} />
          <Field label="Social share image URL" name="ogImageUrl" span defaultValue={article?.og_image_url ?? ""} />
        </Fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel="Saving…" />
        {article && article.status === "published" ? (
          <Link
            href={`/blog/${article.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline underline-offset-4"
          >
            View on the site
          </Link>
        ) : null}
        <Link href="/admin/blog" className="text-sm underline underline-offset-4">
          Back to all pieces
        </Link>
      </div>
    </form>
  );
}
