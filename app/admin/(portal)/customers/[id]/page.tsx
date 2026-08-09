import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getCustomerDetail, type CustomerDetail } from "@/lib/services/customers";
import { PageHeader, Panel, StatCard, Table, Th, Td, Badge, EmptyState } from "@/components/admin/ui";
import { formatPaise, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("customers.view");
  const { id } = await params;

  const result = await getCustomerDetail(id);
  if (!result.ok) {
    if (result.error.code === "not_found") notFound();
    throw new Error(result.error.message);
  }

  const { profile, bookings, refundedPaise } = result.data;
  const now = Date.now();
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.startsAt).getTime() > now
  );
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title={profile.fullName ?? profile.email}
        description={`${profile.email} · signs in with ${profile.provider} · registered ${formatDate(profile.createdAt)}`}
        actions={
          <Link
            href="/admin/customers"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium hairline"
          >
            All customers
          </Link>
        }
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bookings" value={profile.bookingCount} />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard
          label="Total paid"
          value={profile.totalSpendPaise > 0 ? formatPaise(profile.totalSpendPaise) : null}
          hint={profile.totalSpendPaise === 0 ? "No captured payments" : undefined}
        />
        <StatCard
          label="Refunded"
          value={refundedPaise > 0 ? formatPaise(refundedPaise) : null}
          hint={refundedPaise === 0 ? "No refunds" : undefined}
        />
      </section>

      <div className="mt-6 space-y-4">
        <Panel title="Upcoming sessions">
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="This customer has no confirmed sessions in the future."
            />
          ) : (
            <BookingTable rows={upcoming} />
          )}
        </Panel>

        <Panel title="History" description="Past, cancelled and unpaid sessions.">
          {past.length === 0 ? (
            <EmptyState title="No history yet" description="Nothing has completed or lapsed." />
          ) : (
            <BookingTable rows={past} />
          )}
        </Panel>
      </div>

      <p className="mt-6 text-xs text-mist-500">
        Authentication details are deliberately not shown here. HealerJi stores no
        password, no OAuth token and nothing from a sign-in provider beyond the
        name, email and avatar that provider returned.
      </p>
    </>
  );
}

/** Explicit prop type — inferring it through a Result union is fragile. */
function BookingTable({ rows }: { rows: CustomerDetail["bookings"] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Reference</Th>
          <Th>Healer</Th>
          <Th>Session</Th>
          <Th>When</Th>
          <Th align="right">Amount</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id}>
            <Td>
              <Link
                href={`/admin/bookings/${b.id}`}
                className="font-mono text-xs underline-offset-4 hover:underline"
              >
                {b.reference}
              </Link>
            </Td>
            <Td>{b.healerName ?? "—"}</Td>
            <Td className="capitalize">{b.sessionKind}</Td>
            <Td>{formatDate(b.startsAt, true)}</Td>
            <Td align="right">{formatPaise(b.amountPaise)}</Td>
            <Td>
              <Badge
                tone={
                  b.status === "confirmed" || b.status === "completed"
                    ? "positive"
                    : b.status === "pending_payment"
                      ? "warning"
                      : "critical"
                }
              >
                {b.status.replace("_", " ")}
              </Badge>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
