import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getPracticeById } from "@/lib/services/practices";
import { isConfigured } from "@/lib/services/integrations";
import { updatePracticeAction } from "@/lib/actions/practices";
import { PageHeader, Badge } from "@/components/admin/ui";
import { PracticeForm } from "@/components/admin/practice-form";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditPracticePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requirePermission("content.practices.manage");
  const { id } = await params;
  const flags = await searchParams;

  const practice = await getPracticeById(id);
  if (!practice.ok) {
    if (practice.error.code === "not_found") notFound();
    throw new Error(practice.error.message);
  }

  const p = practice.data;
  const stepCount = Array.isArray(p.steps) ? p.steps.length : 0;

  return (
    <>
      <PageHeader
        eyebrow="Guided practices"
        title={p.title}
        description={`${stepCount} steps · ${p.minutes} min · last updated ${formatDate(p.updated_at, true)}`}
        actions={<Badge tone={p.status === "published" ? "positive" : "neutral"}>{p.status}</Badge>}
      />

      {flags.created ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          Created as {p.status}.{" "}
          {p.status === "published" ? "It is live on the site." : "Set status to Published when ready."}
        </p>
      ) : null}

      {stepCount === 0 ? (
        <p role="alert" className="mb-4 rounded-sm border-l-2 border-warning-700 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          This practice has no steps, so the player has nothing to guide. It cannot
          usefully be published until at least one step exists.
        </p>
      ) : null}

      {p.after_note.trim() === "" ? (
        <p className="mb-4 rounded-sm border-l-2 border-warning-700 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          No closing note. That is where the &ldquo;speak to a doctor&rdquo; caveat lives —
          please add one before publishing.
        </p>
      ) : null}

      <PracticeForm
        action={updatePracticeAction}
        practice={p}
        submitLabel="Save changes"
        cloudinaryConfigured={isConfigured("cloudinary")}
      />
    </>
  );
}
