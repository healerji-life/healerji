"use client";

import { useActionState } from "react";
import { saveHealerProfileAction, type HealerSelfState } from "@/lib/actions/healer-self";
import { ImageUpload } from "@/components/admin/image-upload";
import { UPLOAD_FOLDERS_PUBLIC } from "@/components/admin/upload-folders";
import { SubmitButton, FormMessage } from "@/components/admin/form";
import type { HealerRow } from "@/lib/supabase/types";

/**
 * The healer's own profile form.
 *
 * Only descriptive fields are present. Verification, featuring, ranking and
 * pricing are shown read-only below with an explanation, rather than hidden —
 * a healer should be able to see what HealerJi has set about them, just not
 * change it.
 */
export function HealerProfileForm({
  healer, options, initial, cloudinaryConfigured,
}: {
  healer: HealerRow;
  options: {
    languages: { value: string; label: string }[];
    modalities: { value: string; label: string }[];
  };
  initial: { languageCodes: string[]; modalitySlugs: string[] };
  cloudinaryConfigured: boolean;
}) {
  const [state, formAction] = useActionState<HealerSelfState, FormData>(
    saveHealerProfileAction,
    {}
  );

  const chosenLanguages = new Set(initial.languageCodes);
  const chosenModalities = new Set(initial.modalitySlugs);

  return (
    <form action={formAction} className="space-y-6">
      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <section className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Your photograph</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          A clear, warm portrait. This is the first thing someone sees.
        </p>
        <div className="mt-4">
          <ImageUpload
            label="Profile photograph"
            name="avatarUrl"
            altName="avatarAlt"
            initialUrl={healer.avatar_url}
            initialAlt={healer.avatar_alt}
            folder={UPLOAD_FOLDERS_PUBLIC.healers}
            configured={cloudinaryConfigured}
          />
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">How you introduce yourself</h2>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Headline</span>
          <textarea
            name="headline"
            rows={2}
            maxLength={160}
            defaultValue={healer.headline}
            className="w-full rounded-sm bg-surface-50 p-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />
          <span className="mt-1 block text-xs text-mist-500">
            One line on your card. Describe your practice — please don&rsquo;t promise
            an outcome.
          </span>
          {state.fieldErrors?.headline ? (
            <span className="mt-1 block text-xs text-error-700">{state.fieldErrors.headline}</span>
          ) : null}
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">About you</span>
          <textarea
            name="bio"
            rows={8}
            maxLength={4000}
            defaultValue={healer.bio}
            className="w-full rounded-sm bg-surface-50 p-3 text-sm leading-relaxed outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />
          <span className="mt-1 block text-xs text-mist-500">
            In your own voice, first person. What brought you to this work, and what
            a session with you feels like.
          </span>
        </label>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Languages</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          Listed first on your profile. People heal deeper in their mother tongue.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {options.languages.map((option) => (
            <label
              key={option.value}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-50 px-3.5 py-2 text-sm transition-colors has-[:checked]:bg-orchid-500/[0.12] has-[:checked]:text-plum-900 dark:bg-night-950 dark:has-[:checked]:text-orchid-200"
            >
              <input
                type="checkbox"
                name="languages"
                value={option.value}
                defaultChecked={chosenLanguages.has(option.value)}
                className="h-3.5 w-3.5 accent-[#BE3A95]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-e-1 dark:bg-night-900">
        <h2 className="font-display text-[1.0625rem]">Your practices</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          What customers can filter you by.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {options.modalities.map((option) => (
            <label
              key={option.value}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-50 px-3.5 py-2 text-sm transition-colors has-[:checked]:bg-orchid-500/[0.12] has-[:checked]:text-plum-900 dark:bg-night-950 dark:has-[:checked]:text-orchid-200"
            >
              <input
                type="checkbox"
                name="modalities"
                value={option.value}
                defaultChecked={chosenModalities.has(option.value)}
                className="h-3.5 w-3.5 accent-[#BE3A95]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-16 z-10 rounded-lg bg-surface-0/95 py-3 backdrop-blur sm:bottom-0 dark:bg-night-950/95">
        <SubmitButton label="Save profile" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
