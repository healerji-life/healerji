export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 animate-pulse rounded-full bg-mist-200/70 dark:bg-night-800" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded-full bg-mist-200/60 dark:bg-night-800" />
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-mist-200/60 dark:bg-night-800" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-mist-200/50 dark:bg-night-900" />
        ))}
      </div>
    </div>
  );
}
