import { requirePermission } from "@/lib/auth/session";
import { listSubmissionsForAdmin } from "@/lib/services/submissions";
import {
  PageHeader, Panel, Table, Th, Td, Badge, EmptyState, ErrorState,
} from "@/components/admin/ui";

export const metadata = { title: "Inbox · HealerJi Operations" };
export const dynamic = "force-dynamic";

/**
 * Healer applications and contact messages.
 *
 * Both forms used to be pure mail relays — a submission existed only as an
 * email to support@healerji.com, with no record, no queue and no way to tell
 * whether anything had been done about it. The tables existed from the start
 * and nothing had ever written to them.
 *
 * Gated on customers.view rather than a content permission: these rows carry
 * names, email addresses and phone numbers, so an editor should not see them.
 */
const APPLICATION_TONE: Record<string, "positive" | "warning" | "neutral"> = {
  new: "warning",
  reviewing: "warning",
  approved: "positive",
  rejected: "neutral",
};

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** Long free text is a wall in a table cell; the full value is in the title. */
function truncate(value: string, max = 140): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

export default async function AdminInboxPage() {
  await requirePermission("customers.view");
  const result = await listSubmissionsForAdmin();

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Inbox" description="Healer applications and contact messages." />
        <ErrorState message={result.error.message} />
      </>
    );
  }

  const { applications, messages } = result.data;
  const pendingApplications = applications.filter((a) => a.status === "new").length;
  const unhandledMessages = messages.filter((m) => !m.handled_at).length;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Inbox"
        description={
          `${pendingApplications} application${pendingApplications === 1 ? "" : "s"} awaiting review · ` +
          `${unhandledMessages} message${unhandledMessages === 1 ? "" : "s"} unhandled`
        }
      />

      <Panel
        title="Healer applications"
        description="Submitted from /become-a-healer. Stored before the notification email is sent, so a mail failure cannot lose one."
        className="mb-8"
      >
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Applications submitted from the public site will appear here, newest first."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Applicant</Th>
                <Th>Practices</Th>
                <Th>Experience</Th>
                <Th>Status</Th>
                <Th align="right">Received</Th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <span className="block font-medium">{a.name}</span>
                    <span className="block text-sm text-ink-600 dark:text-mist-400">{a.email}</span>
                    {a.phone ? (
                      <span className="block text-sm text-ink-600 dark:text-mist-400">{a.phone}</span>
                    ) : null}
                  </Td>
                  <Td>
                    <span className="block">{truncate(a.modalities, 60)}</span>
                    {a.languages ? (
                      <span className="block text-sm text-ink-600 dark:text-mist-400">{a.languages}</span>
                    ) : null}
                  </Td>
                  <Td>{a.years === null ? "—" : `${a.years} yr`}</Td>
                  <Td><Badge tone={APPLICATION_TONE[a.status] ?? "neutral"}>{a.status}</Badge></Td>
                  <Td align="right">{formatWhen(a.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel
        title="Contact messages"
        description="Submitted from /contact. Reply to the sender's address directly."
      >
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Messages sent through the contact form will appear here, newest first."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>From</Th>
                <Th>Topic</Th>
                <Th>Message</Th>
                <Th align="right">Received</Th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <Td>
                    <span className="block font-medium">{m.name}</span>
                    <span className="block text-sm text-ink-600 dark:text-mist-400">{m.email}</span>
                  </Td>
                  <Td><Badge tone="neutral">{m.topic}</Badge></Td>
                  <Td><span title={m.message}>{truncate(m.message)}</span></Td>
                  <Td align="right">
                    {formatWhen(m.created_at)}
                    {m.handled_at ? (
                      <span className="block text-sm text-ink-600 dark:text-mist-400">handled</span>
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
