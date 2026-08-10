import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listTeamForAdmin } from "@/lib/services/team";
import { archiveTeamMemberAction } from "@/lib/actions/team";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState,
} from "@/components/admin/ui";

export const metadata = { title: "Team · HealerJi Operations" };
export const dynamic = "force-dynamic";

const TONE: Record<string, "positive" | "warning" | "neutral"> = {
  active: "positive",
  inactive: "warning",
  archived: "neutral",
};

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("content.pages.manage");
  const params = await searchParams;
  const result = await listTeamForAdmin();

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Team"
        description="Leadership shown on the About page. Changes appear on the website immediately — no deployment."
        actions={
          <Link
            href="/admin/team/new"
            className="inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950"
          >
            Add person
          </Link>
        }
      />

      {params.created || params.updated || params.archived ? (
        <p role="status" className="mb-6 rounded-sm border-l-2 border-orchid-500 bg-surface-50 p-4 text-sm dark:bg-night-950">
          {params.created ? "Added to the team." : null}
          {params.updated ? "Changes saved." : null}
          {params.archived ? "Archived — they no longer appear on the website." : null}
        </p>
      ) : null}

      <Panel>
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.length === 0 ? (
          <EmptyState
            title="No one here yet"
            description="Add the founder and leadership so the About page has something to render."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Designation</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((m) => (
                <tr key={m.id}>
                  <Td>
                    <Link href={`/admin/team/${m.id}`} className="font-medium underline-offset-4 hover:underline">
                      {m.name}
                    </Link>
                  </Td>
                  <Td>{m.role}</Td>
                  <Td>{m.display_order}</Td>
                  <Td><Badge tone={TONE[m.status] ?? "neutral"}>{m.status}</Badge></Td>
                  <Td align="right">
                    {m.status !== "archived" ? (
                      <form action={archiveTeamMemberAction} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="text-sm text-error-700 underline-offset-4 hover:underline">
                          Archive
                        </button>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
