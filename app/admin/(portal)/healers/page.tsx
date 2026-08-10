import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import {
  listHealersForAdmin,
  type HealerFilters,
} from "@/lib/services/healers";
import { listModalities } from "@/lib/services/reference";
import { cloudinaryThumb } from "@/lib/services/media";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  Td,
  Badge,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/admin/ui";
import { HealerFilterBar } from "@/components/admin/healer-filters";
import { ExportButtons } from "@/components/admin/export-buttons";
import { formatPaise, formatNumber } from "@/lib/format";

export const metadata = { title: "Healers · HealerJi Operations" };
export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  status?: string;
  featured?: string;
  modality?: string;
  page?: string;
  sort?: string;
  dir?: string;
  archived?: string;
  restored?: string;
  error?: string;
};

const STATUS_TONE = {
  active: "positive",
  draft: "warning",
  inactive: "neutral",
  archived: "critical",
} as const;

export default async function AdminHealersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requirePermission("healers.view");

  const params = await searchParams;

  const filters: HealerFilters = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 20,
    ...(params.q ? { search: params.q } : {}),
    ...(params.status
      ? { status: params.status as HealerFilters["status"] }
      : {}),
    ...(params.featured === "1" ? { featured: true } : {}),
    ...(params.modality ? { modality: params.modality } : {}),
    ...(params.sort ? { sort: params.sort } : {}),
    ...(params.dir === "desc" ? { direction: "desc" as const } : {}),
  };

  const [result, modalities] = await Promise.all([
    listHealersForAdmin(filters),
    listModalities(),
  ]);

  const qs = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") {
      qs.set(k, String(v));
    }
  }

  const baseHref = `/admin/healers${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Healers"
        description="Everything here is what the public site renders. Saving a change updates the website immediately — no deployment."
        actions={
          <div className="flex items-center gap-2">
            <ExportButtons dataset="healers" query={qs.toString()} />
            <Link
              href="/admin/healers/import"
              className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035]"
            >
              Import
            </Link>
            <Link
              href="/admin/healers/new"
              className="inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950"
            >
              Add healer
            </Link>
          </div>
        }
      />

      {params.archived ? (
        <p
          role="status"
          className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700"
        >
          Healer archived. Past bookings and payments are untouched.
        </p>
      ) : null}

      {params.restored ? (
        <p
          role="status"
          className="mb-4 rounded-sm bg-success-50 px-4 py-3 text-sm text-success-700"
        >
          Healer restored.
        </p>
      ) : null}

      {params.error === "forbidden" ? (
        <p
          role="alert"
          className="mb-4 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700"
        >
          Your role does not permit that action.
        </p>
      ) : null}

      <HealerFilterBar
        modalities={modalities.ok ? modalities.data : []}
        current={{
          q: params.q ?? "",
          status: params.status ?? "",
          featured: params.featured === "1",
          modality: params.modality ?? "",
        }}
      />

      <div className="mt-4">
        {!result.ok ? (
          <ErrorState message={result.error.message} />
        ) : result.data.rows.length === 0 ? (
          <Panel>
            <EmptyState
              title={
                params.q || params.status
                  ? "Nothing matches those filters"
                  : "No healers yet"
              }
              description={
                params.q || params.status
                  ? "Try clearing the search or status filter."
                  : "Add your first healer, or run supabase/seed.sql to bring across the six from the existing site."
              }
              action={{
                href: "/admin/healers/new",
                label: "Add healer",
              }}
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
                  <Th>Healer</Th>
                  <Th>Status</Th>
                  <Th>Experience</Th>
                  <Th align="right">Rate (45 min)</Th>
                  <Th>Verification</Th>
                  <Th>Order</Th>
                </tr>
              </thead>

              <tbody>
                {result.data.rows.map((h) => {
                  const thumb = cloudinaryThumb(h.avatar_url, 72);

                  const verifiedCount =
                    Number(h.verified_identity) +
                    Number(h.verified_credentials) +
                    Number(h.verified_interviewed);

                  return (
                    <tr
                      key={h.id}
                      className="transition-colors hover:bg-surface-50/70 dark:hover:bg-night-950/50"
                    >
                      <Td>
                        <Link
                          href={`/admin/healers/${h.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-100 dark:bg-night-800">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {h.name}

                              {h.featured ? (
                                <span className="ml-2 align-middle">
                                  <Badge tone="brand">Featured</Badge>
                                </span>
                              ) : null}
                            </span>

                            <span className="block truncate text-xs text-mist-500">
                              /healers/{h.slug}
                            </span>
                          </span>
                        </Link>
                      </Td>

                      <Td>
                        <Badge tone={STATUS_TONE[h.status]}>
                          {h.status}
                        </Badge>
                      </Td>

                      <Td>{h.years} yrs</Td>

                      <Td align="right">
                        {formatPaise(h.price_paise)}
                      </Td>

                      <Td>
                        <span className="text-xs text-mist-500">
                          {verifiedCount === 3
                            ? "Fully verified"
                            : `${verifiedCount} of 3`}
                        </span>
                      </Td>

                      <Td>{formatNumber(h.display_order)}</Td>
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
