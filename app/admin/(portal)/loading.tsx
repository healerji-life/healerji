export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-4 w-28 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-lg bg-mist-200/60 dark:bg-night-800" />
        ))}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-lg bg-mist-200/50 dark:bg-night-900" />
    </div>
  );
}
