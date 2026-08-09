import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getHealerById } from "@/lib/services/healers";
import { listModalities, listLanguages, getHealerRelations } from "@/lib/services/reference";
import { isConfigured } from "@/lib/services/integrations";
import { updateHealerAction, archiveHealerAction, restoreHealerAction } from "@/lib/actions/healers";
import { PageHeader, Panel, Badge } from "@/components/admin/ui";
import { HealerForm } from "@/components/admin/healer-form";
import { InviteHealerPanel } from "@/components/admin/invite-healer";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditHealerPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; restored?: string; error?: string }>;
}) {
  const viewer = await requirePermission("healers.manage");
  const { id } = await params;
  const flags = await searchParams;

  const healer = await getHealerById(id);
  if (!healer.ok) {
    if (healer.error.code === "not_found") notFound();
    throw new Error(healer.error.message);
  }

  const [modalities, languages, relations] = await Promise.all([
    listModalities(),
    listLanguages(),
    getHealerRelations(id),
  ]);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  const h = healer.data;
  const isArchived = h.status === "archived";

  return (
    <>
      <PageHeader
        eyebrow="Healers"
        title={h.name}
        description={`Created ${formatDate(h.created_at)} · last updated ${formatDate(h.updated_at, true)}`}
        actions={
          <>
            {h.status === "active" ? (
              <Link
                href={`/healers/${h.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
              >
                View public profile
              </Link>
            ) : null}
            <form action={isArchived ? restoreHealerAction : archiveHealerAction}>
              <input type="hidden" name="id" value={h.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
              >
                {isArchived ? "Restore" : "Archive"}
              </button>
            </form>
          </>
        }
      />

      {flags.created ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          Healer created. They are {h.status === "active" ? "live on the site" : `in ${h.status} — set status to Active to publish`}.
        </p>
      ) : null}
      {flags.restored ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          Restored as inactive. Set status to Active to make them public again.
        </p>
      ) : null}
      {isArchived ? (
        <p className="mb-4 rounded-sm border-l-2 border-warning-700 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          This healer is archived and hidden from the public site. Their bookings
          and payment records are intact — archiving never deletes financial history.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <HealerForm
          action={updateHealerAction}
          submitLabel="Save changes"
          cloudinaryConfigured={isConfigured("cloudinary")}
          options={{
            modalities: (modalities.ok ? modalities.data : []).map((m) => ({ value: m.slug, label: m.name })),
            languages: (languages.ok ? languages.data : []).map((l) => ({ value: l.code, label: l.name })),
          }}
          initial={{
            healer: h,
            modalitySlugs: relations.ok ? relations.data.modalitySlugs : [],
            languageCodes: relations.ok ? relations.data.languageCodes : [],
            sessionKinds: relations.ok ? relations.data.sessionKinds : [],
            acceptingBookings: relations.ok ? relations.data.acceptingBookings : false,
          }}
        />

        <aside className="space-y-4">
          <Panel title="Portal account">
            <div className="px-6 py-5">
              {h.user_id ? (
                <>
                  <Badge tone="positive">Account linked</Badge>
                  <p className="mt-3 text-sm text-ink-600 dark:text-mist-400">
                    This healer can sign in at <code className="text-xs">/healer/login</code> and
                    manage their own availability.
                  </p>
                  <p className="mt-3 text-xs text-mist-500">
                    You cannot see or set their password. If they are locked out,
                    they use &ldquo;forgotten your password&rdquo; on the sign-in page.
                  </p>
                </>
              ) : can(viewer.roles, "healers.invite") ? (
                <InviteHealerPanel healerId={h.id} origin={origin} />
              ) : (
                <p className="text-sm text-mist-500">
                  No portal account. Inviting healers requires the admin role.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Availability">
            <div className="px-6 py-5 text-sm text-ink-600 dark:text-mist-400">
              <p>
                Working hours are set by the healer in their own portal, so the
                calendar reflects when they have actually agreed to work.
              </p>
              <p className="mt-3 text-xs text-mist-500">
                {relations.ok && relations.data.acceptingBookings
                  ? "This healer is accepting bookings."
                  : "This healer is not accepting bookings, so no slots appear publicly."}
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
