import { LEGAL_META } from "@/lib/config/legal";

/**
 * The metadata every policy carries: who publishes it, when it took
 * effect, which version, and where to raise a grievance. Present and
 * complete, but visually quiet — the policy is what people came for.
 */
export function LegalMeta() {
  return (
    <dl className="mt-16 grid gap-x-10 gap-y-4 border-t border-ink-900/10 pt-8 text-[0.875rem] sm:grid-cols-2 dark:border-surface-0/10">
      {[
        ["Published by", LEGAL_META.company],
        ["Effective", LEGAL_META.effective],
        ["Last updated", LEGAL_META.updated],
        ["Version", LEGAL_META.version],
        ["Contact", LEGAL_META.contact],
        ["Grievance Officer", LEGAL_META.grievance],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-mist-500">{k}</dt>
          <dd className="mt-0.5 text-ink-600 dark:text-mist-400">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
