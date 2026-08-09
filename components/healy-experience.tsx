"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BreathingMark } from "@/components/breathing-mark";
import { Button } from "@/components/ui/button";
import { concerns } from "@/lib/config/taxonomy";
import { pathways } from "@/lib/data/pathways";
import { modalityBySlug } from "@/lib/data/modalities";
import type { Article } from "@/lib/content/article";
import type { Healer } from "@/types";
import { cn } from "@/lib/utils";
import type { PathSlug } from "@/types";

/**
 * Healy on the web: a genuinely functional guided companion. It listens
 * through structured choices, then recommends a pathway, healers, and a
 * practice from real platform data — with its reasoning shown. The
 * free-text AI conversation lives in the HealerJi app; this experience
 * makes no pretence otherwise, and works for every visitor, every time.
 */

type Msg = { from: "healy" | "you"; text: string };
type Stage = "concern" | "language" | "result";

const OPENERS: Msg[] = [
  { from: "healy", text: "Namaste. I'm Healy — HealerJi's companion. I won't diagnose you and I won't rush you; I'll just help you find the right place to begin." },
  { from: "healy", text: "What feels heaviest right now?" },
];

/**
 * DATABASE-BACKED as of pass 4.
 *
 * Healers and articles arrive as props from a server component reading Supabase.
 * The assistant's logic is unchanged — it just recommends real, currently-listed
 * healers rather than a snapshot compiled at build time, which matters because
 * this screen tells someone who to book.
 */
export function HealyExperience({
  healers,
  articles,
}: {
  healers: Healer[];
  articles: Article[];
}) {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState<Stage>("concern");
  const [concern, setConcern] = useState<PathSlug | null>(null);
  const [queue, setQueue] = useState<Msg[]>(OPENERS);
  const logRef = useRef<HTMLDivElement>(null);

  // Drain queue with a typing pause before each Healy message
  useEffect(() => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    if (!next) return;
    if (next.from === "you") {
      setMessages((m) => [...m, next]);
      setQueue(rest);
      return;
    }
    setTyping(true);
    const t = setTimeout(
      () => {
        setTyping(false);
        setMessages((m) => [...m, next]);
        setQueue(rest);
      },
      reduce ? 0 : 700 + Math.min(next.text.length * 6, 900)
    );
    return () => clearTimeout(t);
  }, [queue, reduce]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, typing, reduce]);

  function chooseConcern(slug: PathSlug, label: string) {
    setConcern(slug);
    setStage("language");
    setQueue([
      { from: "you", text: label },
      { from: "healy", text: "Thank you for telling me — that takes something." },
      { from: "healy", text: "One more question: which language would you like to heal in? It matters more than people expect." },
    ]);
  }

  function chooseLanguage(lang: string) {
    const pathway = pathways.find((p) => p.concern === concern && concerns.some((x) => x.slug === p.slug));
    const matched = healers
      .filter((h) => h.languages.includes(lang))
      .filter((h) => (pathway ? h.modalities.some((m) => pathway.modalitySlugs.includes(m)) : true))
      .slice(0, 3);
    const fallback = matched.length ? matched : healers.filter((h) => h.languages.includes(lang)).slice(0, 3);
    const practice = pathway ? articles.find((a) => a.pathway === pathway.slug) : undefined;
    const modNames = pathway
      ? pathway.modalitySlugs.slice(0, 2).map((m) => modalityBySlug(m)?.name).filter(Boolean).join(" and ")
      : "Reiki and breath practice";

    setStage("result");
    setQueue([
      { from: "you", text: lang },
      {
        from: "healy",
        text: `Here's my suggestion, and why: for what you named, healers on HealerJi most often work through ${modNames} — and healing lands deeper in ${lang}. ${
          fallback.length
            ? `${fallback.length === 1 ? "One healer fits" : `${fallback.length} healers fit`} both: ${fallback.map((h) => h.name).join(", ")}.`
            : "New healers join the panel every week; browse everyone while your match arrives."
        }`,
      },
      ...(practice
        ? [{ from: "healy" as const, text: `For tonight, before any booking: "${practice.title}" in the Library — ${practice.minutes} minutes, free.` }]
        : []),
      { from: "healy", text: "No pressure either way. I'll be here." },
    ]);
  }

  const concernOptions = concerns.map((p) => ({ slug: p.slug, label: p.name }));
  const langOptions = ["Hindi", "English", "Tamil", "Bengali"];
  const pathwayForResult = pathways.find((p) => p.concern === concern);

  return (
    <div className="grain relative overflow-hidden rounded-lg bg-night-950 text-surface-0 shadow-e-2 ring-1 ring-surface-0/10">
      <div className="flex items-center gap-3 border-b border-surface-0/10 px-6 py-4">
        <BreathingMark size={22} onDark />
        <div>
          <p className="font-medium leading-none">Healy</p>
          <p className="mt-1 text-xs text-mist-400">
            Guided on the web · free-conversation Healy lives in the app
          </p>
        </div>
      </div>

      <div ref={logRef} className="max-h-[420px] min-h-[320px] space-y-4 overflow-y-auto px-6 py-6" aria-live="polite">
        {messages.map((m, i) => (
          <motion.p
            key={i}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "w-fit max-w-[88%] rounded-md px-4 py-2.5",
              m.from === "you" ? "ml-auto rounded-br-sm bg-orchid-500 text-surface-0" : "rounded-bl-sm bg-surface-0/10 text-surface-0/90"
            )}
          >
            {m.text}
          </motion.p>
        ))}
        <AnimatePresence>
          {typing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-fit items-center gap-1.5 rounded-md bg-surface-0/10 px-4 py-3"
              aria-label="Healy is typing"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-mist-400"
                  animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-surface-0/10 px-6 py-5">
        {queue.length > 0 || typing ? (
          <p className="text-sm text-mist-400">…</p>
        ) : stage === "concern" ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose what feels heaviest">
            {concernOptions.map((o) => (
              <button
                key={o.slug}
                onClick={() => chooseConcern(o.slug, o.label)}
                className="rounded-full bg-surface-0/10 px-4 py-2 text-sm transition-colors hover:bg-surface-0/20"
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : stage === "language" ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose your language">
            {langOptions.map((l) => (
              <button
                key={l}
                onClick={() => chooseLanguage(l)}
                className="rounded-full bg-surface-0/10 px-4 py-2 text-sm transition-colors hover:bg-surface-0/20"
              >
                {l}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button variant="accent" asChild>
              <Link href={pathwayForResult ? `/healers?path=${pathwayForResult.concern}` : "/healers"}>
                Meet these healers
              </Link>
            </Button>
            {pathwayForResult && (
              <Button variant="secondary" className="!text-surface-0 hover:!bg-surface-0/10" asChild>
                <Link href={`/paths/${pathwayForResult.slug}`}>Read the pathway</Link>
              </Button>
            )}
            <Button
              variant="tertiary"
              className="!text-mist-400"
              onClick={() => {
                setMessages([]);
                setConcern(null);
                setStage("concern");
                setQueue(OPENERS);
              }}
            >
              Start over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
