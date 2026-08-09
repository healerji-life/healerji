import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listPracticesForAdmin, type PracticeFilters } from "@/lib/services/practices";
import { setPracticeStatusAction } from "@/lib/actions/practices";
import { PRACTICE_CATEGORIES } from "@/lib/content/practice";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Guided practices · HealerJi Operations" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "positive" | "warning" | "neutral" | "brand"> = {
  published: "positive",
  scheduled: "brand",
  draft: "warning",
  archived: "neutral",
};

export default async function AdminPracticesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("content.practices.manage");
  const params = await searchParams;

  const filters: PracticeFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    ...(params.q ? { search: params.q } : {}),
    ...(params.status ? { status: params.status as PracticeFilters["status"] } : {}),
    ...(params.category ? { category: params.category } : {}),
  };

  const result = await listPracticesForAdmin(filters);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/practices${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Guided practices"
        description="Paced sessions people follow with their eyes closed. Publishing puts one on the site immediately."
        actions={
          <Link
            href="/admin/practices/new"
            className="inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950"
          >
            New practice
          </Link>
        }
      />

      {params.updated ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          Updated. The public site reflects the change.
        </p>
      ) : null}
      {params.error === "forbidden" ? (
        <p role="alert" className="mb-4 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
          Your role does not permit that.
        </p>
      ) : null}

      <FilterBar
        searchPlaceholder="Title, slug or standfirst…"
        filters={[
          {
            kind: "select", name: "status", label: "All statuses",
            options: [
              { value: "published", label: "Published" },
              { value: "scheduled", label: "Scheduled" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ],
          },
          {
            kind: "select", name: "category", label: "All categories",
            options: PRACTICE_CATEGORIES.map((c) => ({ value: c, label: c })),
          },
        ]}
      />

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={qs.toString() ? "Nothing matches those filters" : "No practices yet"}
              description={
                qs.toString()
                  ? "Try clearing the status filter."
                  : "Create the first practice, or run supabase/seed.sql to bring across the four already on the site."
              }
              action={{ href: "/admin/practices/new", label: "New practice" }}
            />
          </Panel>
        ) : (
          <Panel
            footer={
              <Pagination
                page={result.data.page}
                pageSize={result.data.pageSize}
                total={result.data.total}
                baseHref={baseHref}
              />
            }
          >
            <Table>
              <thead>
                <tr>
                  <Th>Practice</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th align="right">Steps</Th>
                  <Th align="right">Length</Th>
                  <Th>Published</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((p) => {
                  const stepCount = Array.isArray(p.steps) ? p.steps.length : 0;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                      <Td>
                        <Link href={`/admin/practices/${p.id}`} className="block max-w-sm">
                          <span className="block truncate font-medium">{p.title}</span>
                          <span className="block truncate text-xs text-mist-500">/practices/{p.slug}</span>
                        </Link>
                      </Td>
                      <Td className="text-xs">{p.category ?? "—"}</Td>
                      <Td>
                        <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                        {p.featured ? (
                          <span className="ml-1.5 align-middle"><Badge tone="brand">Featured</Badge></span>
                        ) : null}
                      </Td>
                      <Td align="right">
                        {stepCount === 0 ? (
                          <span className="text-warning-700">none</span>
                        ) : (
                          stepCount
                        )}
                      </Td>
                      <Td align="right">{p.minutes} min</Td>
                      <Td className="text-xs text-mist-500">
                        {p.published_at ? formatDate(p.published_at) : "—"}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          {p.status === "published" ? (
                            <QuickAction id={p.id} status="draft" label="Unpublish" />
                          ) : (
                            <QuickAction id={p.id} status="published" label="Publish" />
                          )}
                          {p.status !== "archived" ? (
                            <QuickAction id={p.id} status="archived" label="Archive" />
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>
    </>
  );
}

function QuickAction({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setPracticeStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="h-8 rounded-full px-3 text-xs font-medium hairline transition-colors hover:bg-ink-900/[0.04] dark:hover:bg-surface-0/[0.06]"
      >
        {label}
      </button>
    </form>
  );
}
