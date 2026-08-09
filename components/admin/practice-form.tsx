"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { PracticeFormState } from "@/lib/actions/practices";
import type { PracticeRow } from "@/lib/supabase/types";
import { PRACTICE_CATEGORIES, type PracticeStep } from "@/lib/content/practice";
import { Fieldset, Field, TextArea, Select, Toggle, SubmitButton, FormMessage } from "@/components/admin/form";
import { StepEditor } from "@/components/admin/step-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import { UPLOAD_FOLDERS_PUBLIC } from "@/components/admin/upload-folders";

type Action = (state: PracticeFormState, formData: FormData) => Promise<PracticeFormState>;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseSteps(value: unknown): PracticeStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const say = typeof record.say === "string" ? record.say : null;
    const seconds = Number(record.seconds);
    return say && Number.isFinite(seconds) ? [{ say, seconds }] : [];
  });
}

export function PracticeForm({
  action, practice, submitLabel, cloudinaryConfigured,
}: {
  action: Action;
  practice?: PracticeRow;
  submitLabel: string;
  cloudinaryConfigured: boolean;
}) {
  const [state, formAction] = useActionState<PracticeFormState, FormData>(action, {});
  const [status, setStatus] = useState(practice?.status ?? "draft");
  const error = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-4">
      {practice ? <input type="hidden" name="id" value={practice.id} /> : null}

      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <div className="rounded-lg bg-white shadow-e-1 dark:bg-night-900">
        <Fieldset legend="The practice" description="What it is, and how it is paced.">
          <Field
            label="Title" name="title" required span
            defaultValue={practice?.title}
            {...(error("title") ? { error: error("title") } : {})}
          />
          <Field
            label="URL slug" name="slug"
            defaultValue={practice?.slug}
            hint={practice ? `Currently /practices/${practice.slug}` : "Generated from the title when blank."}
            {...(error("slug") ? { error: error("slug") } : {})}
          />
          <Select
            label="Category" name="category"
            defaultValue={practice?.category ?? "Breath"}
            options={PRACTICE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            hint="Drives the filter on /practices."
          />
          <TextArea
            label="Standfirst" name="summary" rows={3} maxLength={400}
            defaultValue={practice?.summary}
            hint="One or two sentences on the card. Describe the practice; never promise an outcome."
            {...(error("summary") ? { error: error("summary") } : {})}
          />

          <StepEditor
            name="steps"
            initial={parseSteps(practice?.steps)}
            {...(state.fieldErrors ? { errors: state.fieldErrors } : {})}
          />
          {error("steps") ? (
            <p role="alert" className="text-xs text-error-700 sm:col-span-2">{error("steps")}</p>
          ) : null}
        </Fieldset>

        <Fieldset
          legend="Closing note"
          description="Shown when the practice completes. This carries the medical-care caveat, so it is not optional in spirit."
          columns={1}
        >
          <TextArea
            label="After the practice" name="afterNote" rows={3} maxLength={800}
            defaultValue={practice?.after_note ?? ""}
            hint="e.g. “If sleeplessness is constant, please also speak with a doctor. This is a companion for hard nights, not a treatment.”"
          />
        </Fieldset>

        <Fieldset legend="Media" description="Optional. The player paces the practice on its own when no recording exists." columns={1}>
          <ImageUpload
            label="Cover image"
            name="coverUrl"
            altName="coverAlt"
            initialUrl={practice?.cover_url ?? null}
            initialAlt={null}
            folder={UPLOAD_FOLDERS_PUBLIC.practices}
            configured={cloudinaryConfigured}
          />
          <Field
            label="Audio URL" name="audioUrl"
            defaultValue={practice?.audio_url ?? ""}
            hint="When set, the player uses the recording automatically. Leave blank for timed guidance only."
          />
        </Fieldset>

        <Fieldset legend="Filing and visibility">
          <Field
            label="Pathway" name="pathway"
            defaultValue={practice?.pathway ?? ""}
            hint="e.g. stress-anxiety"
          />
          <Field
            label="Chakra slug" name="chakraSlug"
            defaultValue={practice?.chakra_slug ?? ""}
            hint="Links this practice from a chakra page, e.g. anahata."
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Status</span>
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PracticeRow["status"])}
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
              defaultValue={toLocalInput(practice?.published_at ?? null)}
              className="h-11 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            />
            <span className="mt-1 block text-xs text-mist-500">Leave blank to publish now.</span>
            {error("publishedAt") ? (
              <span className="mt-1 block text-xs text-error-700">{error("publishedAt")}</span>
            ) : null}
          </label>
          <Field
            label="Display order" name="displayOrder" type="number" min={0}
            defaultValue={practice?.display_order ?? 0}
            hint="Lower sorts first."
          />
          <Toggle
            label="Featured" name="featured"
            defaultChecked={practice?.featured ?? false}
          />
        </Fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel="Saving…" />
        {practice && practice.status === "published" ? (
          <Link
            href={`/practices/${practice.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline underline-offset-4"
          >
            View on the site
          </Link>
        ) : null}
        <Link href="/admin/practices" className="text-sm underline underline-offset-4">
          All practices
        </Link>
      </div>
    </form>
  );
}
