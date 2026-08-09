import { TableSkeleton } from "@/components/admin/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-3 h-8 w-56 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-8 h-14 animate-pulse rounded-lg bg-mist-200/50 dark:bg-night-900" />
      <div className="mt-4 rounded-lg bg-white shadow-e-1 dark:bg-night-900">
        <TableSkeleton rows={8} cols={6} />
      </div>
    </div>
  );
}
