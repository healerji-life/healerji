"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Heart, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadFavourites,
  loadProgress,
  markComplete,
  saveProgress,
  toggleFavourite,
} from "@/lib/practice-progress";
import { easeCalm } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Practice } from "@/lib/content/practice";

const SPEEDS = [0.75, 1, 1.25] as const;

/**
 * The practice player.
 *
 * A real session: each step is held for its own duration, a ring fills
 * as it passes, and the guidance changes on time. It can be paused,
 * resumed days later, replayed, favourited, and slowed down or
 * quickened for people who read at a different pace. Where a recording
 * exists it plays alongside; where none does, the pacing carries the
 * practice on its own rather than pretending at a player.
 */
export function PracticePlayer({ practice }: { practice: Practice }) {
  const reduce = useReducedMotion();
  const total = useMemo(() => practice.steps.reduce((t, s) => t + s.seconds, 0), [practice]);

  const [step, setStep] = useState(0);
  const [elapsedInStep, setElapsedInStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [done, setDone] = useState(false);
  const [favourite, setFavourite] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<number | null>(null);
  const [history, setHistory] = useState<{ times: number; last?: string }>({ times: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = practice.steps[step]!;
  const stepSeconds = current.seconds / speed;

  // Restore favourite, resume point and history
  useEffect(() => {
    setFavourite(loadFavourites().includes(practice.slug));
    const p = loadProgress()[practice.slug];
    if (p) {
      setHistory({ times: p.timesCompleted, last: p.completedAt });
      if (p.step > 0 && p.step < practice.steps.length) setResumeOffer(p.step);
    }
  }, [practice.slug, practice.steps.length]);

  // The clock
  useEffect(() => {
    if (!playing || done) return;
    const id = setInterval(() => {
      setElapsedInStep((e) => {
        const next = e + 0.25;
        if (next >= stepSeconds) {
          if (step + 1 >= practice.steps.length) {
            setPlaying(false);
            setDone(true);
            markComplete(practice.slug);
            setHistory((h) => ({ times: h.times + 1, last: new Date().toISOString() }));
            return 0;
          }
          setStep((s) => {
            saveProgress(practice.slug, { step: s + 1 });
            return s + 1;
          });
          return 0;
        }
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing, done, stepSeconds, step, practice.steps.length, practice.slug]);

  const stepProgress = Math.min(elapsedInStep / stepSeconds, 1);
  const secondsBefore = practice.steps.slice(0, step).reduce((t, s) => t + s.seconds, 0);
  const overall = Math.min((secondsBefore + elapsedInStep * speed) / total, 1);
  const remaining = Math.max(0, Math.round((total - secondsBefore - elapsedInStep * speed) / 60));

  const restart = useCallback(() => {
    setStep(0);
    setElapsedInStep(0);
    setDone(false);
    setPlaying(true);
    saveProgress(practice.slug, { step: 0 });
  }, [practice.slug]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = speed;
    if (playing) void a.play().catch(() => undefined);
    else a.pause();
  }, [playing, speed]);

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="rounded-lg bg-surface-0 p-8 shadow-e-2 dark:bg-night-900 md:p-10">
      {practice.audio && <audio ref={audioRef} src={practice.audio} preload="none" />}

      {/* Header: title, favourite, history */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
            {practice.category} · {practice.minutes} min
          </p>
          <h2 className="mt-2 font-display text-2xl">{practice.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setFavourite(toggleFavourite(practice.slug).includes(practice.slug))}
          aria-pressed={favourite}
          aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            favourite ? "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900" : "hairline hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
          )}
        >
          <Heart className={cn("h-4 w-4", favourite && "fill-current")} aria-hidden />
        </button>
      </div>

      {history.times > 0 && (
        <p className="mt-3 text-[0.875rem] text-mist-500">
          Completed {history.times} {history.times === 1 ? "time" : "times"}
          {history.last && ` · last on ${new Date(history.last).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`}
        </p>
      )}

      {/* Resume offer */}
      {resumeOffer !== null && !playing && step === 0 && !done && (
        <div className="mt-6 rounded-sm bg-ink-900/[0.03] p-5 dark:bg-surface-0/[0.05]">
          <p className="text-[0.9375rem] text-ink-600 dark:text-mist-400">
            You stopped partway through last time — step {resumeOffer + 1} of {practice.steps.length}.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              size="sm"
              onClick={() => {
                setStep(resumeOffer);
                setResumeOffer(null);
                setPlaying(true);
              }}
            >
              Resume there
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setResumeOffer(null)}>
              Start from the beginning
            </Button>
          </div>
        </div>
      )}

      {/* The practice itself */}
      <div className="mt-10 flex flex-col items-center text-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-900/10 dark:text-surface-0/15" />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="#BE3A95"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - stepProgress)}
              style={{ transition: reduce ? "none" : "stroke-dashoffset 0.25s linear" }}
            />
          </svg>
          <span className="font-display text-2xl tabular-nums">
            {done ? "✓" : `${Math.max(0, Math.ceil(stepSeconds - elapsedInStep))}`}
          </span>
        </div>

        <div className="mt-8 min-h-[5.5rem] max-w-[38ch]">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="font-display text-xl">That&rsquo;s the practice.</p>
                <p className="mt-3 text-ink-600 dark:text-mist-400">{practice.after}</p>
              </motion.div>
            ) : (
              <motion.p
                key={step}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.6, ease: easeCalm }}
                className="font-display text-lg leading-relaxed"
              >
                {current.say}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-3">
          {done ? (
            <Button onClick={restart}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Practise again
            </Button>
          ) : (
            <>
              <Button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause practice" : "Begin practice"}>
                {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {playing ? "Pause" : step === 0 && elapsedInStep === 0 ? "Begin" : "Continue"}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Skip to next step"
                onClick={() => {
                  setElapsedInStep(0);
                  if (step + 1 >= practice.steps.length) {
                    setDone(true);
                    setPlaying(false);
                    markComplete(practice.slug);
                  } else {
                    setStep((s) => s + 1);
                  }
                }}
              >
                <SkipForward className="h-4 w-4" aria-hidden />
              </Button>
            </>
          )}
        </div>

        {/* Pace */}
        {!done && (
          <div className="mt-6 flex items-center gap-2" role="group" aria-label="Pace">
            <span className="text-[0.8125rem] text-mist-500">Pace</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[0.8125rem] tabular-nums transition-colors",
                  speed === s ? "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900" : "text-mist-500 hover:text-ink-900 dark:hover:text-surface-0"
                )}
              >
                {s === 1 ? "Normal" : s < 1 ? "Slower" : "Quicker"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overall progress */}
      <div className="mt-10">
        <div className="h-px w-full bg-ink-900/10 dark:bg-surface-0/15">
          <div
            className="h-px bg-plum-900 dark:bg-surface-0"
            style={{ width: `${overall * 100}%`, transition: reduce ? "none" : "width 0.25s linear" }}
          />
        </div>
        <div className="mt-3 flex justify-between text-[0.8125rem] text-mist-500">
          <span>
            Step {step + 1} of {practice.steps.length}
          </span>
          <span className="tabular-nums">
            {done ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden /> Complete
              </span>
            ) : (
              `${remaining} min left`
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
