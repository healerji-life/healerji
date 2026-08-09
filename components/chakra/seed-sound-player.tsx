"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { claimAudio, releaseAudio } from "@/lib/audio-bus";
import { BREATH } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Chakra } from "@/lib/data/chakras";

type State = "idle" | "checking" | "unavailable" | "loading" | "playing" | "paused" | "ended" | "error";

/**
 * The seed sound player.
 *
 * One component, used everywhere a bīja is heard. It plays a real
 * recording and nothing else — no oscillator, no speech synthesis, no
 * substitute tone dressed up as a mantra. On mount it asks the server
 * whether the file exists (a HEAD request, no download), so the
 * interface can tell the truth about availability before anyone
 * presses anything.
 *
 * Playback is started only from a user gesture, which is what mobile
 * Safari requires; `.play()` returns a promise and its rejection is
 * handled rather than swallowed. Volume, seek, loop, replay, keyboard
 * control and ARIA state are all wired, and the shared audio bus
 * guarantees only one mantra sounds at a time.
 */
export function SeedSoundPlayer({
  chakra,
  audioSrc,
  compact = false,
  className,
}: {
  chakra: Chakra;
  audioSrc?: string;
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const src = audioSrc ?? chakra.audio;

  const elRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<State>("checking");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);

  const playing = state === "playing";

  /* Does the recording actually exist? Ask before promising anything. */
  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setState("unavailable");
      return;
    }
    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        const type = r.headers.get("content-type") ?? "";
        // A 404 handled by the app shell returns HTML, not audio.
        setState(r.ok && !type.includes("text/html") ? "idle" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const stop = useCallback(() => {
    const el = elRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setTime(0);
    setState((s) => (s === "unavailable" || s === "error" ? s : "idle"));
  }, []);

  /* Leaving the page stops the sound. */
  useEffect(() => {
    return () => {
      elRef.current?.pause();
      releaseAudio(stop);
    };
  }, [stop]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
    el.loop = loop;
  }, [volume, muted, loop]);

  const toggle = useCallback(() => {
    const el = elRef.current;
    if (!el || state === "unavailable") return;

    if (playing) {
      el.pause();
      setState("paused");
      return;
    }
    claimAudio(stop); // silence any other mantra first
    setState("loading");
    void el
      .play()
      .then(() => setState("playing"))
      .catch(() => setState("error"));
  }, [playing, state, stop]);

  const replay = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    el.currentTime = 0;
    claimAudio(stop);
    void el.play().then(() => setState("playing")).catch(() => setState("error"));
  }, [stop]);

  const seek = (value: number) => {
    const el = elRef.current;
    if (!el || !duration) return;
    el.currentTime = value;
    setTime(value);
  };

  const available = state !== "unavailable";
  const progress = duration ? time / duration : 0;
  const bars = compact ? 16 : 26;

  const statusText =
    state === "unavailable"
      ? "Recording not yet available"
      : state === "error"
        ? "That recording could not be played"
        : state === "loading"
          ? "Loading"
          : state === "playing"
            ? "Playing"
            : state === "paused"
              ? "Paused"
              : state === "ended"
                ? "Finished"
                : "Ready";

  return (
    <div
      className={cn(
        "rounded-md",
        !compact && "border p-6",
        className
      )}
      style={!compact ? { borderColor: "var(--ck-border, rgba(20,20,20,0.1))" } : undefined}
    >
      {src && (
        <audio
          ref={elRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setState("ended");
            releaseAudio(stop);
          }}
          onError={() => setState((s) => (s === "checking" ? "unavailable" : "error"))}
        />
      )}

      <div className="flex items-center gap-5">
        {/* The bīja, pulsing while it sounds */}
        <span className="relative flex shrink-0 items-center justify-center" style={{ width: compact ? 64 : 92, height: compact ? 64 : 92 }}>
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: chakra.color, opacity: 0.28 }}
            animate={playing && !reduce ? { scale: [0.9, 1.15, 0.9], opacity: [0.24, 0.44, 0.24] } : { scale: 1, opacity: 0.2 }}
            transition={{ duration: BREATH / 2, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
          />
          <span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: chakra.color, opacity: 0.45 }}
          />
          <motion.span
            className="relative leading-none"
            style={{
              color: "var(--ck-fg, currentColor)",
              fontFamily: "var(--font-tiro), serif",
              fontSize: compact ? 24 : 34,
            }}
            animate={playing && !reduce ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] } : { scale: 1, opacity: 1 }}
            transition={{ duration: BREATH / 2, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
          >
            {chakra.bijaDevanagari}
          </motion.span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-3 leading-none">
            <span className="font-display text-lg" style={{ color: "var(--ck-fg, currentColor)" }}>
              {chakra.bija}
            </span>
            <span className="text-[0.9375rem]" style={{ color: "var(--ck-muted, #6b6b6b)" }}>
              {chakra.sanskrit} · {chakra.name}
            </span>
          </p>
          {!compact && (
            <p className="mt-1.5 text-[0.875rem]" style={{ color: "var(--ck-muted, #6b6b6b)" }}>
              {chakra.bijaPronunciation}
            </p>
          )}

          {/* Waveform — fills with real progress, breathes while sounding */}
          <div className="mt-3 flex h-6 items-center gap-[3px]" aria-hidden>
            {Array.from({ length: bars }).map((_, i) => (
              <motion.span
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  backgroundColor: chakra.color,
                  opacity: available ? (progress * bars > i ? 0.95 : 0.3) : 0.18,
                }}
                animate={
                  playing && !reduce
                    ? { height: [5, 7 + ((i * 7) % 14), 5] }
                    : { height: 5 + ((i * 5) % 5) }
                }
                transition={
                  playing && !reduce
                    ? { duration: 2.2, repeat: Infinity, delay: i * 0.06, ease: "easeInOut" }
                    : { duration: 0.5 }
                }
              />
            ))}
          </div>

          {/* Seek */}
          {!compact && (
            <label className="mt-3 block">
              <span className="sr-only">Seek within the {chakra.bija} recording</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                disabled={!available || !duration}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                style={{ accentColor: chakra.color, backgroundColor: "var(--ck-border, rgba(20,20,20,0.12))" }}
              />
            </label>
          )}

          {/* State, spoken as text — never colour or motion alone */}
          <p
            className="mt-2 text-[0.8125rem]"
            style={{ color: "var(--ck-muted, #6b6b6b)" }}
            role="status"
            aria-live="polite"
            id={`seed-status-${uid}`}
          >
            {statusText}
            {available && duration > 0 && state !== "unavailable" && (
              <span className="tabular-nums">
                {" · "}
                {formatTime(time)} / {formatTime(duration)}
              </span>
            )}
          </p>
        </div>

        {/* Transport */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            disabled={!available || state === "loading"}
            aria-describedby={`seed-status-${uid}`}
            aria-label={
              !available
                ? `A recording of ${chakra.bija} is not available yet`
                : playing
                  ? `Pause the ${chakra.bija} chant`
                  : `Play the ${chakra.bija} chant`
            }
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: playing ? chakra.color : "transparent",
              border: `1px solid ${playing ? chakra.color : "var(--ck-border, rgba(20,20,20,0.14))"}`,
              color: playing ? "#FFFFFF" : "var(--ck-fg, currentColor)",
            }}
          >
            {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          </button>

          {!compact && (
            <>
              <button
                type="button"
                onClick={replay}
                disabled={!available}
                aria-label={`Replay the ${chakra.bija} chant from the beginning`}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
                style={{ color: "var(--ck-muted, #6b6b6b)" }}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                disabled={!available}
                aria-pressed={muted}
                aria-label={muted ? "Unmute" : "Mute"}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
                style={{ color: "var(--ck-muted, #6b6b6b)" }}
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Volume and loop */}
      {!compact && (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex flex-1 items-center gap-3">
            <span className="text-[0.8125rem]" style={{ color: "var(--ck-muted, #6b6b6b)" }}>
              Volume
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              disabled={!available}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(false);
              }}
              className="h-1 max-w-[10rem] flex-1 cursor-pointer appearance-none rounded-full disabled:opacity-40"
              style={{ accentColor: chakra.color, backgroundColor: "var(--ck-border, rgba(20,20,20,0.12))" }}
              aria-label="Volume"
            />
          </label>
          <button
            type="button"
            onClick={() => setLoop((l) => !l)}
            aria-pressed={loop}
            disabled={!available}
            className="rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors disabled:opacity-40"
            style={{
              border: `1px solid ${loop ? chakra.color : "var(--ck-border, rgba(20,20,20,0.14))"}`,
              color: loop ? chakra.color : "var(--ck-muted, #6b6b6b)",
            }}
          >
            Repeat
          </button>
        </div>
      )}

      {!available && !compact && (
        <p className="mt-4 text-[0.8125rem]" style={{ color: "var(--ck-muted, #6b6b6b)" }}>
          We are recording these chants with a practitioner rather than
          generating them. Until {chakra.bija} is recorded, the written
          pronunciation above is the practice.
        </p>
      )}
    </div>
  );
}

function formatTime(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
