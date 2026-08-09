"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { BREATH, easeCalm } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The device, in the hero — an invitation, not an advertisement.
 *
 * The screen renders a designed HealerJi home screen (below). A real
 * screenshot at /public/app/screenshot.png or a silent clip at
 * /public/app/preview.mp4 takes its place automatically, at the same
 * size, with no layout change.
 *
 * Three small glass cards rest around the phone naming what lives
 * inside — companion, practice, sessions — and nothing shouts.
 */

const FEATURES = [
  { label: "Healy, your companion", side: "left" as const, top: "16%" },
  { label: "Guided practice", side: "right" as const, top: "42%" },
  { label: "Sessions & reminders", side: "left" as const, top: "70%" },
];

export function AppShowcase({
  screenshot = "/app/screenshot.png",
  video,
  className,
}: {
  /** e.g. "/app/screen.png" */
  screenshot?: string;
  /** e.g. "/app/preview.mp4" — takes precedence when both are set */
  video?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className={cn("relative mx-auto w-full max-w-[420px]", className)}>
      {/* Ambient light behind the device */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px] animate-breathe-slow"
        style={{ backgroundColor: "rgba(75,14,66,0.10)" }}
      />

      <motion.div
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
        className="relative mx-auto w-[228px]"
      >
        {/* Device */}
        <div className="relative rounded-[38px] bg-night-950 p-[9px] shadow-e-3 ring-1 ring-ink-900/10">
          <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[30px] bg-surface-0 dark:bg-night-900">
            {/* The replaceable slot */}
            {video ? (
              <video
                src={video}
                autoPlay
                muted
                loop
                playsInline
                aria-label="A short preview of the HealerJi app"
                className="h-full w-full object-cover"
              />
            ) : screenshot ? (
              <Image
                src={screenshot}
                alt="The HealerJi app home screen"
                fill
                sizes="228px"
                className="object-cover"
              />
            ) : (
              <AppScreenPlaceholder />
            )}
            {/* Screen glass */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(150deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 42%)",
              }}
            />
          </div>
          {/* Speaker */}
          <span aria-hidden className="absolute left-1/2 top-[18px] h-1 w-12 -translate-x-1/2 rounded-full bg-surface-0/25" />
        </div>
      </motion.div>

      {/* Glass cards, resting */}
      {FEATURES.map((f, i) => (
        <motion.p
          key={f.label}
          aria-hidden
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 + i * 0.18, ease: easeCalm }}
          className={cn(
            "glass absolute hidden whitespace-nowrap rounded-full px-4 py-2 text-[0.8125rem] text-ink-900 shadow-e-1 dark:text-surface-0 lg:block",
            f.side === "left" ? "-left-4" : "-right-4"
          )}
          style={{ top: f.top }}
        >
          {f.label}
        </motion.p>
      ))}
    </div>
  );
}

/**
 * The HealerJi home screen, drawn to scale.
 *
 * Not a skeleton and not a fake screenshot — a designed rendering of
 * the product's actual morning state: today's practice mid-session,
 * Healy noticing something, the next booking, and the week so far. It
 * shows enough of the philosophy to make the app worth wanting, and is
 * replaced automatically the moment a real screenshot or clip is
 * placed at /public/app/screenshot.png or /public/app/preview.mp4.
 */
function AppScreenPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-plum-50 via-surface-0 to-surface-0 p-3.5 dark:from-night-900 dark:via-night-950 dark:to-night-950">
      {/* Status row */}
      <div className="flex items-center justify-between text-[7px] text-mist-500">
        <span className="tabular-nums">6:42</span>
        <span className="flex items-center gap-0.5">
          <span className="block h-1 w-1 rounded-full bg-current opacity-60" />
          <span className="block h-1.5 w-1 rounded-sm bg-current opacity-60" />
          <span className="block h-2 w-1 rounded-sm bg-current opacity-60" />
        </span>
      </div>

      {/* Greeting */}
      <p className="mt-3 text-[10px] leading-tight text-ink-900 dark:text-surface-0">
        Good morning,
        <br />
        <span className="text-mist-500">let&rsquo;s begin gently.</span>
      </p>

      {/* Today's practice — the hero card */}
      <div className="mt-3 rounded-xl bg-plum-900 p-3 text-surface-0 dark:bg-surface-0 dark:text-ink-900">
        <p className="text-[6.5px] uppercase tracking-[0.14em] opacity-70">Today&rsquo;s practice</p>
        <p className="mt-1 text-[9px] leading-tight">Nine minutes of breath</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20">
            <span className="ml-[1px] block h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-current" />
          </span>
          <span className="h-[2px] flex-1 rounded-full bg-current/25">
            <span className="block h-[2px] w-1/3 rounded-full bg-current" />
          </span>
          <span className="text-[6.5px] tabular-nums opacity-70">3:04</span>
        </div>
      </div>

      {/* Healy */}
      <div className="mt-2.5 rounded-xl bg-surface-0 p-2.5 shadow-e-1 dark:bg-night-900">
        <div className="flex items-center gap-1.5">
          <span className="block h-3 w-3 rounded-full bg-orchid-500/25 ring-1 ring-orchid-500/40" />
          <p className="text-[7px] font-medium text-ink-900 dark:text-surface-0">Healy</p>
        </div>
        <p className="mt-1.5 text-[6.5px] leading-relaxed text-mist-500">
          You slept late three nights running. Shall we try the evening
          wind-down?
        </p>
      </div>

      {/* Next session */}
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-surface-0 p-2.5 shadow-e-1 dark:bg-night-900">
        <span className="block h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-plum-200 to-orchid-200" />
        <span className="min-w-0 flex-1">
          <span className="block text-[7px] font-medium text-ink-900 dark:text-surface-0">
            Meera K. · Reiki
          </span>
          <span className="block text-[6.5px] text-mist-500">Tomorrow, 7:00 pm</span>
        </span>
        <span className="rounded-full bg-ink-900/[0.06] px-1.5 py-0.5 text-[6px] text-mist-500 dark:bg-surface-0/10">
          Join
        </span>
      </div>

      {/* Journey strip */}
      <div className="mt-2.5">
        <p className="text-[6.5px] uppercase tracking-[0.12em] text-mist-500">This week</p>
        <div className="mt-1.5 flex gap-1">
          {[1, 1, 1, 0.55, 0, 0, 0].map((v, i) => (
            <span key={i} className="h-5 flex-1 rounded-[3px] bg-ink-900/[0.06] dark:bg-surface-0/10">
              <span
                className="block w-full rounded-[3px] bg-plum-900/70 dark:bg-surface-0/60"
                style={{ height: `${v * 100}%`, marginTop: `${(1 - v) * 100}%` }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-auto flex items-center justify-between pt-3">
        {["Today", "Heal", "Learn", "You"].map((t, i) => (
          <span
            key={t}
            className={
              i === 0
                ? "text-[6.5px] text-ink-900 dark:text-surface-0"
                : "text-[6.5px] text-mist-500"
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
