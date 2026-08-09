import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listArticlesForAdmin, listArticleCategories, type ArticleFilters } from "@/lib/services/articles";
import { setArticleStatusAction } from "@/lib/actions/articles";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState, Pagination,
} from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/filter-bar";
import { ExportButtons } from "@/components/admin/export-buttons";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Blog · HealerJi Operations" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "positive" | "warning" | "neutral" | "brand"> = {
  published: "positive",
  scheduled: "brand",
  draft: "warning",
  archived: "neutral",
};

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("content.blog.manage");
  const params = await searchParams;

  const filters: ArticleFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    ...(params.q ? { search: params.q } : {}),
    ...(params.status ? { status: params.status as ArticleFilters["status"] } : {}),
    ...(params.category ? { category: params.category } : {}),
  };

  const [result, categories] = await Promise.all([
    listArticlesForAdmin(filters),
    listArticleCategories(),
  ]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, v);
  const baseHref = `/admin/blog${qs.toString() ? `?${qs.toString()}` : ""}`;

  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Journal"
        description="Publishing here puts a piece on the public site immediately. Unpublishing removes it."
        actions={
          <>
            <ExportButtons dataset="articles" query={qs.toString()} />
            <Link
              href="/admin/blog/import"
              className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
            >
              Import
            </Link>
            <Link
              href="/admin/blog/new"
              className="inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950"
            >
              New piece
            </Link>
          </>
        }
      />

      {params.updated ? (
        <p role="status" className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700">
          Updated. The public site reflects the change.
        </p>
      ) : null}
      {params.error === "forbidden" ? (
        <p role="alert" className="mb-4 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
          Your role does not permit publishing.
        </p>
      ) : null}

      <FilterBar
        searchPlaceholder="Title, slug or author…"
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
            options: (categories.ok ? categories.data : []).map((c) => ({ value: c.slug, label: c.name })),
          },
        ]}
      />

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={qs.toString() ? "Nothing matches those filters" : "No pieces yet"}
              description={
                qs.toString()
                  ? "Try clearing the status filter."
                  : "Write the first piece, or run supabase/seed.sql to bring across the six already on the site."
              }
              action={{ href: "/admin/blog/new", label: "New piece" }}
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
                  <Th>Title</Th>
                  <Th>Status</Th>
                  <Th>Category</Th>
                  <Th>Author</Th>
                  <Th>Published</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((a) => {
                  const pendingSchedule =
                    a.status === "published" && a.published_at !== null &&
                    new Date(a.published_at).getTime() > now;
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50">
                      <Td>
                        <Link href={`/admin/blog/${a.id}`} className="block max-w-md">
                          <span className="block truncate font-medium">{a.title}</span>
                          <span className="block truncate text-xs text-mist-500">/blog/{a.slug}</span>
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
                        {a.featured ? (
                          <span className="ml-1.5 align-middle">
                            <Badge tone="brand">Featured</Badge>
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-xs">{a.category_slug ?? "—"}</Td>
                      <Td className="text-xs">{a.author_name}</Td>
                      <Td className="text-xs text-mist-500">
                        {a.published_at ? formatDate(a.published_at) : "—"}
                        {pendingSchedule ? (
                          <span className="block text-orchid-500">not live until then</span>
                        ) : null}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          {a.status === "published" ? (
                            <QuickAction id={a.id} status="draft" label="Unpublish" />
                          ) : (
                            <QuickAction id={a.id} status="published" label="Publish" />
                          )}
                          {a.status !== "archived" ? (
                            <QuickAction id={a.id} status="archived" label="Archive" />
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

/**
 * Status transitions from the list.
 *
 * A plain form posting to a server action, so it works without JavaScript and
 * cannot be triggered by a stale client bundle holding an old permission.
 */
function QuickAction({
  id, status, label,
}: {
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={setArticleStatusAction}>
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
