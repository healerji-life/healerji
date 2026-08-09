"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { HealerCard } from "@/components/healer-card";
import { Button } from "@/components/ui/button";
import { concerns } from "@/lib/config/taxonomy";
import { modalityBySlug } from "@/lib/data/modalities";
import { isAvailableToday } from "@/lib/services/healer-adapter";
import { cn } from "@/lib/utils";
import type { Healer } from "@/types";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition-colors duration-200",
        active
          ? "bg-plum-800 text-surface-0"
          : "hairline text-ink-600 hover:bg-surface-100 dark:text-mist-400 dark:hover:bg-night-900"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Filters mirror how HealerJi actually matches people with healers:
 * concern, language, gender preference, and availability.
 */
export function HealerBrowser({ healers }: { healers: Healer[] }) {
  const initialPath = useSearchParams().get("path");
  const [path, setPath] = useState<string | null>(initialPath);
  const [language, setLanguage] = useState<string | null>(null);
  const [gender, setGender] = useState<"female" | "male" | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);

  const languages = useMemo(
    () => Array.from(new Set(healers.flatMap((h) => h.languages))).sort(),
    [healers]
  );

  const results = useMemo(() => {
    return healers.filter((h) => {
      if (language && !h.languages.includes(language)) return false;
      if (gender && h.gender !== gender) return false;
      // Was a startsWith("Today") string test against mock data. Now a real
      // date comparison against the healer's next genuinely open slot.
      if (todayOnly && !isAvailableToday(h.nextAvailableAt)) return false;
      if (path) {
        const inPath = h.modalities.some((m) =>
          modalityBySlug(m)?.paths.includes(path as never)
        );
        if (!inPath) return false;
      }
      return true;
    });
  }, [healers, path, language, gender, todayOnly]);

  const anyFilter = path !== null || language !== null || gender !== null || todayOnly;

  function clearAll() {
    setPath(null);
    setLanguage(null);
    setGender(null);
    setTodayOnly(false);
  }

  return (
    <div>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by concern">
          {concerns.map((p) => (
            <Chip
              key={p.slug}
              active={path === p.slug}
              onClick={() => setPath(path === p.slug ? null : p.slug)}
            >
              {p.name}
            </Chip>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by language, healer gender, and availability"
        >
          {languages.map((l) => (
            <Chip
              key={l}
              active={language === l}
              onClick={() => setLanguage(language === l ? null : l)}
            >
              {l}
            </Chip>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-surface-200 sm:block" aria-hidden />
          <Chip
            active={gender === "female"}
            onClick={() => setGender(gender === "female" ? null : "female")}
          >
            Female healers
          </Chip>
          <Chip
            active={gender === "male"}
            onClick={() => setGender(gender === "male" ? null : "male")}
          >
            Male healers
          </Chip>
          <span className="mx-1 hidden h-5 w-px bg-surface-200 sm:block" aria-hidden />
          <Chip active={todayOnly} onClick={() => setTodayOnly((v) => !v)}>
            Available today
          </Chip>
          {anyFilter && (
            <Button variant="tertiary" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      <p className="mt-8 text-sm text-mist-500" aria-live="polite">
        {results.length} healer{results.length === 1 ? "" : "s"}
        {anyFilter ? " match your preferences" : " ready to meet you"}
      </p>

      {results.length === 0 ? (
        <div className="mt-10 rounded-md bg-surface-100/60 p-10 text-center dark:bg-night-900">
          <p className="font-display text-xl">No one matches all of that — yet.</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-ink-600 dark:text-mist-400">
            Try loosening one filter — new healers join the panel regularly, so
            the right match may be days away.
          </p>
          <Button variant="secondary" className="mt-6" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      ) : (
        <motion.ul layout className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((h) => (
              <motion.li
                layout
                key={h.slug}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HealerCard healer={h} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <p className="mt-12 text-[13px] text-mist-500">
        Recommendations are based on your concern, preferred time, language,
        gender preference, and age — the way HealerJi has always matched
        people with healers.
      </p>
    </div>
  );
}
