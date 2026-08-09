import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { integrationStatuses } from "@/lib/services/integrations";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Badge, Table, Th, Td } from "@/components/admin/ui";

export const metadata = { title: "Settings · HealerJi Operations" };
export const dynamic = "force-dynamic";

/**
 * Settings.
 *
 * Every secret on this page is reported as present-or-absent and nothing more.
 * integrationStatuses() reads process.env only to test for a non-empty string —
 * it never returns a value, so there is nothing here that could leak into HTML,
 * a screenshot or a browser cache.
 *
 * Operational configuration lives in app_settings, which carries a CHECK
 * constraint rejecting any key matching secret/password/token/api_key, so a
 * secret cannot be stored there even by mistake.
 */
export default async function AdminSettingsPage() {
  const viewer = await requirePermission("settings.view");
  const integrations = integrationStatuses();

  const supabase = await createClient();
  const { data: settings } = supabase
    ? await supabase.from("app_settings").select("key, value, label, description, category").order("category")
    : { data: null };

  const byCategory = new Map<string, typeof settings>();
  for (const row of settings ?? []) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list as never);
  }

  const configured = integrations.filter((i) => i.configured).length;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Settings"
        description={`${configured} of ${integrations.length} integrations connected. Secret values are never displayed or stored in the database.`}
      />

      <Panel
        title="Integrations"
        description="Configuration state only, read from the deployment environment."
      >
        <ul className="divide-y divide-mist-200/50 dark:divide-night-800/70">
          {integrations.map((integration) => (
            <li key={integration.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{integration.label}</p>
                <p className="mt-0.5 text-sm text-ink-600 dark:text-mist-400">{integration.purpose}</p>

                {integration.configured ? (
                  <p className="mt-2 font-mono text-xs text-mist-500">
                    {/* Present, and deliberately unreadable. */}
                    &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                    <span className="ml-2 font-sans">set in the deployment environment</span>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-mist-500">
                    Needs: <span className="font-mono">{integration.missing.join(", ")}</span>
                  </p>
                )}

                {integration.docs ? (
                  <p className="mt-1.5 text-xs text-mist-500">{integration.docs}</p>
                ) : null}
              </div>

              <Badge tone={integration.configured ? "positive" : "neutral"}>
                {integration.configured ? "Connected" : "Not configured"}
              </Badge>
            </li>
          ))}
        </ul>
        <div className="border-t border-mist-200/70 px-6 py-4 dark:border-night-800">
          <p className="text-sm text-ink-600 dark:text-mist-400">
            Keys are updated in Vercel &rarr; Project &rarr; Settings &rarr;
            Environment Variables, then redeployed. They are deliberately not
            editable here: a key that can be changed from a browser session is a
            key that can be stolen from one.
          </p>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[...byCategory.entries()].map(([category, rows]) => (
          <Panel key={category} title={categoryLabel(category)}>
            <Table>
              <thead>
                <tr>
                  <Th>Setting</Th>
                  <Th align="right">Value</Th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((row) => (
                  <tr key={row.key}>
                    <Td>
                      <span className="block text-sm">{row.label ?? row.key}</span>
                      {row.description ? (
                        <span className="block text-xs text-mist-500">{row.description}</span>
                      ) : null}
                    </Td>
                    <Td align="right" className="font-mono text-xs">
                      {JSON.stringify(row.value)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        ))}

        <Panel title="Security posture">
          <ul className="space-y-3 px-6 py-5 text-sm">
            <Item done>Row Level Security enabled on every public table</Item>
            <Item done>Role changes blocked for non-super-admins by database trigger</Item>
            <Item done>Healers cannot alter pricing, ranking or verification</Item>
            <Item done>Payments and refunds cannot be deleted by anyone</Item>
            <Item done>Audit log rejects UPDATE and DELETE</Item>
            <Item done>Razorpay signatures verified server-side, webhooks idempotent</Item>
            <Item done>Analytics ingestion is service-role only, no raw IP stored</Item>
          </ul>
          <div className="border-t border-mist-200/70 px-6 py-4 dark:border-night-800">
            <Link href="/admin/audit" className="text-sm underline underline-offset-4">
              Review the audit log
            </Link>
          </div>
        </Panel>

        {!can(viewer.roles, "settings.manage") ? (
          <Panel title="Editing">
            <p className="px-6 py-5 text-sm text-ink-600 dark:text-mist-400">
              Changing platform settings is reserved to a super admin. You can see
              the current state but not alter it.
            </p>
          </Panel>
        ) : (
          <Panel title="Editing">
            <p className="px-6 py-5 text-sm text-ink-600 dark:text-mist-400">
              Editing these values from this screen is not built yet. They are
              currently changed directly in <code className="text-xs">app_settings</code>.
              Rather than show inputs that discard what you type, they are read-only here.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    booking: "Booking",
    analytics: "Analytics",
    general: "General",
    payments: "Payments",
    email: "Email",
  };
  return labels[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

function Item({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className={
          done
            ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-100 text-[10px] text-success-700"
            : "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-mist-300"
        }
      >
        {done ? "✓" : ""}
      </span>
      <span>{children}</span>
    </li>
  );
}
