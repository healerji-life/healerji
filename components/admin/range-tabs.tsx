import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/lib/services/analytics";

const LABELS: Record<Exclude<RangePreset, "custom">, string> = {
  today: "Today",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  ytd: "This year",
};

/**
 * Date-range selector. Plain links, so the range lives in the URL — an admin
 * can bookmark or share "bookings, last 90 days" and it survives a reload.
 */
export function RangeTabs({
  basePath, current, extraParams,
}: {
  basePath: string;
  current: RangePreset;
  extraParams?: Record<string, string | undefined>;
}) {
  const qs = (range: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams ?? {})) if (v) sp.set(k, v);
    sp.set("range", range);
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div className="inline-flex rounded-full bg-surface-50 p-0.5 dark:bg-night-900" role="group" aria-label="Date range">
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
        <Link
          key={key}
          href={qs(key)}
          aria-current={current === key ? "true" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors",
            current === key
              ? "bg-white font-medium text-plum-900 shadow-e-1 dark:bg-night-800 dark:text-orchid-200"
              : "text-ink-600 hover:text-ink-900 dark:text-mist-400 dark:hover:text-surface-0"
          )}
        >
          {LABELS[key]}
        </Link>
      ))}
    </div>
  );
}
