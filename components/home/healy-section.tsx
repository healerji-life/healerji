"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { BreathingMark } from "@/components/breathing-mark";

/**
 * A scripted, honest taste of Healy: three fixed exchanges, clearly a
 * preview. The real conversation lives at /healy behind consent.
 */
const script = [
  {
    you: "I haven't been sleeping. My mind won't stop at night.",
    healy:
      "That sounds exhausting — carrying the day into the night. Can I ask: is it worry that keeps you up, or does your body just not settle?",
  },
  {
    you: "Worry, mostly. Work things. Money things.",
    healy:
      "Thank you for telling me. Two gentle suggestions: a short breath practice tonight from our Library, and — if you'd like — I can introduce you to three healers who work with exactly this. No pressure either way.",
  },
  {
    you: "Okay. Show me.",
    healy:
      "Here's what I'd suggest: the Money & abundance path, with Kabir for breathwork or Arjun for the practical side. And tonight, 'Unwinding the Day' — nine minutes, in Hindi or English. Shall we begin?",
  },
];

export function HealySection() {
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const reduce = useReducedMotion();
  const done = step >= script.length;

  function advance() {
    if (done || typing) return;
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setStep((s) => s + 1);
    }, reduce ? 0 : 900);
  }

  return (
    <section className="bg-night-950 py-28 text-surface-0 md:py-40" aria-labelledby="healy-heading">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <SectionHeading
            id="healy-heading"
            eyebrow="Healy · HealerJi's AI assistant"
            title="Someone to talk to, before you talk to someone."
            lede="Healy listens first, explains its suggestions, and never pretends to be a therapist. Everything you share is private, yours to delete, and never used to sell to you."
            className="mb-8 [&_h2]:text-surface-0 [&_p:last-child]:text-mist-400"
          />
          <ul className="space-y-3 text-mist-400">
            <li>· Suggests a path, three healers, and one practice — with its reasoning shown.</li>
            <li>· Speaks English and Hindi; more languages are coming.</li>
            <li>· In a crisis, Healy's only job is connecting you with real human help.</li>
          </ul>
          <Button variant="accent" className="mt-8" asChild>
            <Link href="/healy">Start a real conversation</Link>
          </Button>
        </div>

        {/* Preview device */}
        <div className="rounded-md bg-night-900 p-6 shadow-e-2 ring-1 ring-surface-0/10">
          <div className="mb-5 flex items-center gap-3 border-b border-surface-0/10 pb-4">
            <BreathingMark size={22} onDark />
            <div>
              <p className="font-medium leading-none">Healy</p>
              <p className="mt-1 text-xs text-mist-400">A preview · your real chat is private</p>
            </div>
          </div>
          <div className="min-h-[280px] space-y-4" aria-live="polite">
            {script.slice(0, step).map((ex, i) => (
              <div key={i} className="space-y-4">
                <p className="ml-auto w-fit max-w-[85%] rounded-md rounded-br-sm bg-plum-700 px-4 py-2.5">
                  {ex.you}
                </p>
                <p className="w-fit max-w-[90%] rounded-md rounded-bl-sm bg-surface-0/10 px-4 py-2.5 text-surface-0/90">
                  {ex.healy}
                </p>
              </div>
            ))}
            <AnimatePresence>
              {typing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-fit rounded-md bg-surface-0/10 px-4 py-2.5 text-mist-400"
                >
                  Healy is listening…
                </motion.p>
              )}
            </AnimatePresence>
            {step === 0 && !typing && (
              <p className="text-mist-400">
                Tap below to see how a first conversation feels.
              </p>
            )}
          </div>
          <div className="mt-5 border-t border-surface-0/10 pt-4">
            {done ? (
              <Button variant="accent" className="w-full" asChild>
                <Link href="/healy">Continue with Healy</Link>
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="w-full !text-surface-0 hover:!bg-surface-0/10"
                onClick={advance}
                disabled={typing}
              >
                {step === 0 ? "Play the preview" : "Continue"}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
