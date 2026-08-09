import { cn } from "@/lib/utils";

/**
 * Export controls.
 *
 * Plain links, not fetch calls: the browser's own download handling is more
 * reliable than reconstructing a Blob, and it means the button works with
 * middle-click and "save as" like any other download.
 *
 * The current filters are forwarded verbatim, so the file matches the table.
 */
export function ExportButtons({
  dataset, query, formats = ["csv", "xlsx", "pdf"], className,
}: {
  dataset: "healers" | "bookings" | "payments" | "customers" | "articles";
  /** The page's current query string, without a leading "?". */
  query?: string;
  formats?: ("csv" | "xlsx" | "pdf")[];
  className?: string;
}) {
  const href = (format: string) => {
    const params = new URLSearchParams(query ?? "");
    params.set("dataset", dataset);
    params.set("format", format);
    return `/api/admin/export?${params.toString()}`;
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {formats.map((format) => (
        <a
          key={format}
          href={href(format)}
          // Not prefetched and not a client transition: this is a file download.
          download
          className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
        >
          {format.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
