import { cn } from "@/lib/utils";

/**
 * Charts as plain SVG, rendered on the server.
 *
 * Deliberately not a charting library: these ship zero JavaScript, cannot
 * disagree with the numbers in the table beside them, and have no version API
 * to drift. An operations dashboard needs legibility, not interactivity.
 *
 * An empty or all-zero series renders the empty state rather than a flat line
 * along the axis, which reads as "we measured zero" instead of "nothing was
 * measured".
 */

export interface SeriesDatum {
  label: string;
  value: number;
}

export function BarChart({
  data, height = 168, format, emptyMessage = "No data in this period.", accent = "orchid",
}: {
  data: SeriesDatum[];
  height?: number;
  format?: (value: number) => string;
  emptyMessage?: string;
  accent?: "orchid" | "plum";
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);

  if (data.length === 0 || max === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-sm bg-surface-50/60 text-sm text-mist-500 dark:bg-night-950/60"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const width = 720;
  const gap = data.length > 60 ? 1 : 3;
  const barWidth = Math.max(1, (width - gap * (data.length - 1)) / data.length);
  const fill = accent === "orchid" ? "fill-orchid-500/85" : "fill-plum-900/80";

  // Label every nth bar so the axis stays readable at 90 days.
  const step = Math.ceil(data.length / 7);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Chart, maximum ${format ? format(max) : max}`}
        className="w-full"
        style={{ height }}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0} x2={width}
            y1={height - height * f} y2={height - height * f}
            className="stroke-mist-200/70 dark:stroke-night-800"
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const h = max === 0 ? 0 : (d.value / max) * (height - 6);
          return (
            <rect
              key={`${d.label}-${i}`}
              x={i * (barWidth + gap)}
              y={height - h}
              width={barWidth}
              height={Math.max(d.value > 0 ? 1.5 : 0, h)}
              rx={barWidth > 6 ? 2 : 0.5}
              className={fill}
            >
              <title>{`${d.label}: ${format ? format(d.value) : d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-[0.6875rem] tabular-nums text-mist-500">
        {data
          .map((d, i) => ({ d, i }))
          .filter(({ i }) => i % step === 0 || i === data.length - 1)
          .map(({ d, i }) => (
            <span key={`${d.label}-${i}`}>{d.label}</span>
          ))}
      </figcaption>
    </figure>
  );
}

/** A compact horizontal ranking — used for top healers, pages and blogs. */
export function RankBars({
  data, format, emptyMessage,
}: {
  data: (SeriesDatum & { href?: string; caption?: string })[];
  format?: (value: number) => string;
  emptyMessage: string;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  if (data.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-mist-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-mist-200/50 dark:divide-night-800/70">
      {data.map((d, i) => (
        <li key={`${d.label}-${i}`} className="px-6 py-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate text-sm">{d.label}</span>
            <span className="shrink-0 text-sm tabular-nums text-ink-600 dark:text-mist-400">
              {format ? format(d.value) : d.value}
            </span>
          </div>
          {d.caption ? <p className="mt-0.5 text-xs text-mist-500">{d.caption}</p> : null}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-mist-200/60 dark:bg-night-800">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r from-orchid-500 to-plum-900")}
              style={{ width: max > 0 ? `${Math.max(2, (d.value / max) * 100)}%` : "0%" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
