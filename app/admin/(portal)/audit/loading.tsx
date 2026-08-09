import { TableSkeleton } from "@/components/admin/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-3 h-8 w-56 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-lg bg-mist-200/60 dark:bg-night-800" />
        ))}
      </div>
      <div className="mt-6 rounded-lg bg-white shadow-e-1 dark:bg-night-900">
        <TableSkeleton rows={7} cols={6} />
      </div>
    </div>
  );
}
