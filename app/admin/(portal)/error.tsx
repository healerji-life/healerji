"use client";

/**
 * Route-level error boundary. Deliberately shows the message and a retry
 * rather than a blank screen — and deliberately does not render the stack,
 * which can contain query fragments.
 */
export default function AdminError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border-l-2 border-error-700 bg-white p-8 shadow-e-1 dark:bg-night-900">
      <h2 className="font-display text-xl">Something went wrong loading this screen.</h2>
      <p className="mt-2 max-w-lg text-sm text-ink-600 dark:text-mist-400">
        Nothing was changed. Try again, and if it keeps happening quote this
        reference to support.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-mist-500">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-10 rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950"
      >
        Try again
      </button>
    </div>
  );
}
