"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { HealerFormState } from "@/lib/actions/healers";
import type { HealerRow } from "@/lib/supabase/types";
import { Fieldset, Field, TextArea, Select, Toggle, CheckboxGroup, SubmitButton, FormMessage } from "@/components/admin/form";
import { ImageUpload } from "@/components/admin/image-upload";
import { UPLOAD_FOLDERS_PUBLIC } from "@/components/admin/upload-folders";

type Action = (state: HealerFormState, formData: FormData) => Promise<HealerFormState>;

export interface HealerFormOptions {
  modalities: { value: string; label: string }[];
  languages: { value: string; label: string }[];
}

export interface HealerFormInitial {
  healer?: HealerRow;
  modalitySlugs: string[];
  languageCodes: string[];
  sessionKinds: string[];
  acceptingBookings: boolean;
}

/**
 * The healer editor.
 *
 * Every field rendered on the public healer card or profile page is here, so
 * changing a card never means editing TypeScript and pushing to GitHub. What
 * is deliberately absent: anything that would let this form set an account
 * password. Healers are invited and choose their own.
 */
export function HealerForm({
  action, options, initial, cloudinaryConfigured, submitLabel,
}: {
  action: Action;
  options: HealerFormOptions;
  initial: HealerFormInitial;
  cloudinaryConfigured: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<HealerFormState, FormData>(action, {});
  const h = initial.healer;
  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-4">
      {h ? <input type="hidden" name="id" value={h.id} /> : null}

      {state.error || state.notice ? (
        <FormMessage {...(state.error ? { error: state.error } : { notice: state.notice })} />
      ) : null}

      <div className="rounded-lg bg-white shadow-e-1 dark:bg-night-900">
        <Fieldset
          legend="Basic information"
          description="Name, address and the words that introduce this healer."
        >
          <Field
            label="Full name" name="name" required
            defaultValue={h?.name}
            {...(fieldError("name") ? { error: fieldError("name") } : {})}
          />
          <Field
            label="URL slug" name="slug"
            defaultValue={h?.slug}
            hint={h ? `Currently /healers/${h.slug}` : "Left blank, this is generated from the name."}
            {...(fieldError("slug") ? { error: fieldError("slug") } : {})}
          />
          <TextArea
            label="Headline" name="headline" rows={2} maxLength={160}
            defaultValue={h?.headline}
            hint="One line, shown on the healer card. Describe the practice, never promise an outcome."
          />
          <TextArea
            label="Biography" name="bio" rows={7} maxLength={4000}
            defaultValue={h?.bio}
            hint="Written in the healer's own voice, first person."
          />
          <div className="sm:col-span-2">
            <ImageUpload
              label="Profile photograph"
              name="avatarUrl"
              altName="avatarAlt"
              initialUrl={h?.avatar_url ?? null}
              initialAlt={h?.avatar_alt ?? null}
              folder={UPLOAD_FOLDERS_PUBLIC.healers}
              configured={cloudinaryConfigured}
            />
          </div>
        </Fieldset>

        <Fieldset
          legend="Professional"
          description="What this healer practises, and in which languages."
        >
          <Field
            label="Years of practice" name="years" type="number" min={0} max={80}
            defaultValue={h?.years ?? 0}
          />
          <Select
            label="Gender" name="gender"
            defaultValue={h?.gender ?? "undisclosed"}
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Other" },
              { value: "undisclosed", label: "Prefer not to say" },
            ]}
          />
          <CheckboxGroup
            label="Modalities" name="modalities"
            options={options.modalities}
            selected={initial.modalitySlugs}
            hint="Drives filtering on /healers."
          />
          <CheckboxGroup
            label="Languages" name="languages"
            options={options.languages}
            selected={initial.languageCodes}
            hint="Listed first on the public profile — people heal best in their mother tongue."
          />
        </Fieldset>

        <Fieldset
          legend="Sessions & pricing"
          description="The base rate is for a 45-minute session; 30 and 60 minutes are calculated from it."
        >
          <Field
            label="Base rate (₹, 45 minutes)" name="priceRupees" type="number" min={0} step="1"
            defaultValue={h ? h.price_paise / 100 : 0}
            hint="Stored in paise. Never edited by the healer."
            {...(fieldError("priceRupees") ? { error: fieldError("priceRupees") } : {})}
          />
          <Field
            label="Timezone" name="timezone"
            defaultValue={h?.timezone ?? "Asia/Kolkata"}
            hint="IANA name. Availability is expressed in this zone."
          />
          <CheckboxGroup
            label="Session types offered" name="sessionKinds"
            options={[
              { value: "chat", label: "Chat" },
              { value: "audio", label: "Audio" },
              { value: "video", label: "Video" },
            ]}
            selected={initial.sessionKinds}
            hint="Unticking a type deactivates its offerings; existing bookings are untouched."
          />
          <Toggle
            label="Accepting bookings" name="acceptingBookings"
            defaultChecked={initial.acceptingBookings}
            hint="Off means no slots appear publicly, whatever the availability rules say."
          />
        </Fieldset>

        <Fieldset legend="Visibility" description="Where and whether this healer appears.">
          <Select
            label="Status" name="status"
            defaultValue={h?.status ?? "draft"}
            options={[
              { value: "draft", label: "Draft — not public" },
              { value: "active", label: "Active — visible and bookable" },
              { value: "inactive", label: "Inactive — hidden, not archived" },
              { value: "archived", label: "Archived" },
            ]}
            hint="Only 'active' healers are returned to the public site."
          />
          <Field
            label="Display order" name="displayOrder" type="number" min={0}
            defaultValue={h?.display_order ?? 0}
            hint="Lower sorts first."
          />
          <Toggle
            label="Featured" name="featured"
            defaultChecked={h?.featured ?? false}
            hint="Featured healers appear on the homepage."
          />
        </Fieldset>

        <Fieldset
          legend="Verification"
          description="Set by HealerJi after checks. A healer can never set these themselves — the database blocks it."
        >
          <Toggle label="Identity verified" name="verifiedIdentity" defaultChecked={h?.verified_identity ?? false} />
          <Toggle label="Credentials verified" name="verifiedCredentials" defaultChecked={h?.verified_credentials ?? false} />
          <Toggle label="Interviewed" name="verifiedInterviewed" defaultChecked={h?.verified_interviewed ?? false} />
        </Fieldset>

        <Fieldset legend="Search engines" description="Falls back to the name and headline when blank.">
          <Field
            label="SEO title" name="seoTitle" maxLength={70}
            defaultValue={h?.seo_title ?? ""}
          />
          <Field
            label="SEO description" name="seoDescription" maxLength={180}
            defaultValue={h?.seo_description ?? ""}
          />
        </Fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel="Saving…" />
        <Link href="/admin/healers" className="text-sm underline underline-offset-4">
          Cancel
        </Link>
      </div>
    </form>
  );
}
