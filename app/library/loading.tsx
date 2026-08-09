import { Container } from "@/components/ui/container";

export default function LibraryLoading() {
  return (
    <div className="pb-40 pt-44" aria-busy="true" aria-label="Loading the library">
      <Container>
        <div className="h-12 w-72 animate-pulse rounded-md bg-surface-200 dark:bg-night-900" />
        <div className="mt-4 h-6 w-full max-w-xl animate-pulse rounded-md bg-surface-100 dark:bg-night-900" />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-md bg-surface-100 dark:bg-night-900" />
          ))}
        </div>
      </Container>
    </div>
  );
}
