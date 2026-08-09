"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bookingWindow, toDateKey } from "@/lib/booking/window";
import { cn } from "@/lib/utils";

/**
 * A real calendar: month grid, keyboard operable, dates outside the
 * booking window disabled rather than hidden, today marked, and the
 * selected date announced. Weeks start Monday, as they do in India.
 */
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function Calendar({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dateKey: string) => void;
}) {
  const { first, last } = useMemo(bookingWindow, []);
  const [cursor, setCursor] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1));

  const grid = useMemo(() => {
    const start = new Date(cursor);
    const startDay = (start.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startDay }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return cells;
  }, [cursor]);

  const canPrev = cursor > new Date(first.getFullYear(), first.getMonth(), 1);
  const canNext = cursor < new Date(last.getFullYear(), last.getMonth(), 1);
  const todayKey = toDateKey(new Date());

  return (
    <div className="w-full max-w-[22rem]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canPrev && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={!canPrev}
          aria-label="Previous month"
          className="hairline flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-ink-900/[0.035] disabled:opacity-30 dark:hover:bg-surface-0/[0.06]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <p aria-live="polite" className="font-display text-lg">
          {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => canNext && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          disabled={!canNext}
          aria-label="Next month"
          className="hairline flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-ink-900/[0.035] disabled:opacity-30 dark:hover:bg-surface-0/[0.06]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-2 text-[0.6875rem] uppercase tracking-[0.12em] text-mist-500">
            {d}
          </span>
        ))}
        {grid.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const key = toDateKey(date);
          const disabled = date < first || date > last;
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              onClick={() => onChange(key)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-full text-[0.9375rem] tabular-nums transition-colors",
                disabled && "text-mist-500/40",
                !disabled && !selected && "hover:bg-ink-900/[0.05] dark:hover:bg-surface-0/[0.08]",
                selected && "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900"
              )}
            >
              {date.getDate()}
              {key === todayKey && !selected && (
                <span aria-hidden className="absolute bottom-1.5 h-1 w-1 rounded-full bg-plum-900/60 dark:bg-surface-0/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
