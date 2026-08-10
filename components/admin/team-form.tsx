"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Fieldset, Field, TextArea, Select, SubmitButton, FormMessage } from "@/components/admin/form";
import { ImageUpload } from "@/components/admin/image-upload";
import { UPLOAD_FOLDERS_PUBLIC } from "@/components/admin/upload-folders";
import type { TeamFormState } from "@/lib/actions/team";
import type { TeamMemberRow } from "@/lib/supabase/types";

type Action = (state: TeamFormState, formData: FormData) => Promise<TeamFormState>;

const STATUS_OPTIONS = [
  { value: "active", label: "Active — shown on the website" },
  { value: "inactive", label: "Inactive — hidden, kept on file" },
  { value: "archived", label: "Archived" },
];

/**
 * Shared by the new and edit screens. The person's photograph goes through the
 * same signed Cloudinary upload the healer and article forms use, so no
 * credential reaches the browser.
 */
export function TeamForm({
  action,
  member,
  cloudinaryConfigured,
}: {
  action: Action;
  member?: TeamMemberRow;
  cloudinaryConfigured: boolean;
}) {
  const [state, formAction] = useActionState<TeamFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="mt-8 space-y-8">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <Fieldset legend="Person" description="Name and designation appear on the About page.">
        <Field
          label="Name" name="name" required maxLength={120}
          defaultValue={member?.name ?? ""}
          {...(errors.name ? { error: errors.name } : {})}
        />
        <Field
          label="Designation" name="role" required maxLength={120}
          defaultValue={member?.role ?? ""}
          hint="For example: Chief Technology Officer"
          {...(errors.role ? { error: errors.role } : {})}
        />
        <TextArea
          label="Biography" name="bio" rows={5} maxLength={2000}
          defaultValue={member?.bio ?? ""}
          {...(errors.bio ? { error: errors.bio } : {})}
        />
      </Fieldset>

      <Fieldset legend="Photograph" description="Square images read best in the team grid.">
        <ImageUpload
          name="photoUrl"
          altName="photoAlt"
          initialUrl={member?.photo_url ?? ""}
          initialAlt={member?.photo_alt ?? ""}
          folder={UPLOAD_FOLDERS_PUBLIC.team}
          configured={cloudinaryConfigured}
          label="Profile photograph"
        />
      </Fieldset>

      <Fieldset legend="Links and ordering">
        <Field
          label="LinkedIn URL" name="linkedinUrl" span
          defaultValue={member?.linkedin_url ?? ""}
          {...(errors.linkedinUrl ? { error: errors.linkedinUrl } : {})}
        />
        <Field
          label="Display order" name="displayOrder" type="number" min={0} max={9999}
          defaultValue={member?.display_order ?? 0}
          hint="Lower numbers appear first."
          {...(errors.displayOrder ? { error: errors.displayOrder } : {})}
        />
        <Select
          label="Status" name="status"
          defaultValue={member?.status ?? "active"}
          options={STATUS_OPTIONS}
        />
      </Fieldset>

      <FormMessage {...(state.error ? { error: state.error } : {})} />

      <div className="flex items-center gap-3">
        <SubmitButton
          label={member ? "Save changes" : "Add to team"}
          pendingLabel="Saving…"
        />
        <Link
          href="/admin/team"
          className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
