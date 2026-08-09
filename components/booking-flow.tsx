"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, CalendarCheck2, Check, Lock, MessageCircle, Mic, ShieldCheck, Video } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AvatarArt } from "@/components/ui/avatar-art";
import { Calendar } from "@/components/booking/calendar";
import {
  DURATIONS,
  PART_LABEL,
  DAY_PARTS,
  type DayAvailability,
  type Duration,
  type Slot,
} from "@/lib/booking/window";
import { easeCalm } from "@/lib/motion";
import { cn, formatINR } from "@/lib/utils";
import { trackEvent } from "@/components/analytics/tracker";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { Healer, SessionType } from "@/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (r: unknown) => void) => void;
    };
  }
}

const detailsSchema = z.object({
  name: z.string().min(2, "Please tell us your name."),
  email: z.string().email("That email doesn't look right."),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/, "Please enter a phone number we can reach you on."),
  note: z.string().max(600, "Please keep the note under 600 characters.").optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm you've read how your note is used." }),
  }),
  acknowledge: z.literal(true, {
    errorMap: () => ({
      message: "Please confirm you're 18 or older and understand what a session is.",
    }),
  }),
});

const STEPS = ["Healer", "Session", "Time", "Details", "Payment"] as const;
const TYPE_META: Record<SessionType, { icon: typeof Video; label: string }> = {
  chat: { icon: MessageCircle, label: "Chat" },
  audio: { icon: Mic, label: "Audio call" },
  video: { icon: Video, label: "Video call" },
};

/**
 * The booking flow, now end to end against the database.
 *
 * What changed, and why each matters:
 *
 *   healers      arrive as a prop from a server component reading Supabase,
 *                so the list and the prices are whatever admin last saved.
 *   slots        come from /api/booking/slots, which reads the healer's real
 *                availability. Only open times are returned, so there is
 *                nothing struck-through to render any more.
 *   the hold     happens before Razorpay opens. /api/checkout reserves the slot
 *                in the same statement that writes the booking, so the time is
 *                genuinely ours before anyone is asked for money.
 *   confirmation comes from /api/booking/verify, which checks the signature
 *                server-side and reads the booking status back out of the
 *                database. Nothing is written from this component.
 */
export function BookingFlow({
  healers,
  initialHealer,
}: {
  healers: Healer[];
  initialHealer?: string;
}) {
  const preset = healers.find((h) => h.slug === initialHealer);
  const [step, setStep] = useState(preset ? 1 : 0);
  const [healer, setHealer] = useState<Healer | undefined>(preset);
  const [type, setType] = useState<SessionType | null>(preset?.sessionTypes[0] ?? null);
  const [duration, setDuration] = useState<Duration>(45);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [fields, setFields] = useState({ name: "", email: "", phone: "", note: "", consent: false, acknowledge: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    reference: string;
    startsAt: string;
    amountPaise: number;
  } | null>(null);

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  // Indicative only, for the review screen. The amount actually charged is
  // computed by the database in create_booking_hold and returned by
  // /api/checkout — this figure is never sent to the server.
  const price = healer ? Math.round((healer.pricePaise * duration) / 45) : 0;

  /**
   * Real availability for the chosen day.
   *
   * reloadToken is bumped when a slot is lost to another customer mid-checkout,
   * which re-runs this and shows the calendar as it now actually stands.
   */
  useEffect(() => {
    if (!healer || !dateKey) return;
    const controller = new AbortController();
    setLoadingSlots(true);
    setSlotsError(null);
    setSlot(null);

    const query = new URLSearchParams({
      healer: healer.slug,
      date: dateKey,
      minutes: String(duration),
    });

    fetch(`/api/booking/slots?${query.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as
          | { ok: true; data: DayAvailability }
          | { ok: false; error: string };
        if (!body.ok) {
          setAvailability(null);
          setSlotsError(body.error);
          return;
        }
        setAvailability(body.data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailability(null);
        setSlotsError("We couldn't load available times. Please try again.");
      })
      .finally(() => setLoadingSlots(false));

    return () => controller.abort();
  }, [healer, dateKey, duration, reloadToken]);

  function validateDetails(): boolean {
    const res = detailsSchema.safeParse({ ...fields, note: fields.note || undefined });
    if (res.success) {
      setErrors({});
      return true;
    }
    const map: Record<string, string> = {};
    for (const issue of res.error.issues) map[String(issue.path[0])] = issue.message;
    setErrors(map);
    return false;
  }

  /**
   * Reserve the slot, then pay for it.
   *
   * The order is not an implementation detail: the slot is held server-side
   * before Razorpay opens, so nobody can be charged for a time that was given
   * away while they were typing their card number.
   */
  const pay = useCallback(async () => {
    if (!healer || !type || !slot) return;
    setPaying(true);
    setPayError(null);

    try {
      // ------------------------------------------------- 1. hold + order
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healer: healer.slug,
          sessionType: type,
          slot: slot.id,
          minutes: duration,
          name: fields.name,
          email: fields.email,
          phone: fields.phone,
          note: fields.note || undefined,
          sourcePath: typeof window === "undefined" ? undefined : window.location.pathname,
          sourceRoute: "/book",
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        code?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        reference?: string;
      };

      // The slot went to someone else between rendering and clicking. This is
      // the exclusion constraint doing its job; recover gracefully rather than
      // showing a failure the customer cannot act on.
      if (res.status === 409 || data.code === "slot_taken") {
        setPaying(false);
        setSlot(null);
        setPayError("This time was just booked. Please choose another available time.");
        setReloadToken((n) => n + 1);
        setStep(2);
        return;
      }

      if (!res.ok || !data.orderId || !data.reference) {
        setPayError(
          data.error ??
            "We couldn't start the payment. Nothing has been charged — please try again."
        );
        setPaying(false);
        return;
      }

      if (!window.Razorpay) {
        setPayError(
          "The payment window couldn't load. Check your connection and try again — nothing was charged."
        );
        setPaying(false);
        return;
      }

      const reference = data.reference;
      const amountPaise = data.amount ?? price;

      // ----------------------------------------------------- 2. checkout
      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: amountPaise,
        currency: data.currency ?? "INR",
        name: "HealerJi",
        description: `${TYPE_META[type].label} · ${duration} min with ${healer.name}`,
        prefill: { name: fields.name, email: fields.email, contact: fields.phone },
        theme: { color: "#4B0E42" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setPayError(
              "Payment was cancelled — nothing has been charged. Your slot is held for a few more minutes."
            );
          },
        },
        // ------------------------------------------- 3. server verification
        handler: (response: unknown) => {
          const r = response as {
            razorpay_order_id?: string;
            razorpay_payment_id?: string;
            razorpay_signature?: string;
          };

          void (async () => {
            try {
              const verifyRes = await fetch("/api/booking/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: r.razorpay_order_id,
                  razorpay_payment_id: r.razorpay_payment_id,
                  razorpay_signature: r.razorpay_signature,
                  reference,
                }),
              });

              const verified = (await verifyRes.json()) as {
                ok?: boolean;
                status?: string;
                error?: string;
                startsAt?: string;
                amountPaise?: number;
              };

              setPaying(false);

              if (!verifyRes.ok || !verified.ok) {
                setPayError(
                  verified.error ??
                    "Your payment went through but we couldn't confirm it automatically. Quote reference " +
                      reference +
                      " to support and your session will be honoured."
                );
                return;
              }

              // Only treat it as booked if the DATABASE says so. A verified
              // payment that has not yet flipped the booking is reported
              // honestly rather than shown as confirmed.
              if (verified.status === "confirmed" || verified.status === "completed") {
                // Recorded only once the DATABASE says confirmed, so the funnel
                // cannot over-count on a payment that did not settle.
                trackEvent(ANALYTICS_EVENTS.payment_success, {
                  reference,
                  amountPaise: verified.amountPaise ?? amountPaise,
                });
                trackEvent(ANALYTICS_EVENTS.booking_complete, {
                  reference,
                  healer: healer.slug,
                  sessionType: type,
                  minutes: duration,
                });
                setConfirmed({
                  reference,
                  startsAt: verified.startsAt ?? slot.id,
                  amountPaise: verified.amountPaise ?? amountPaise,
                });
                return;
              }

              setPayError(
                "Your payment is verified and we are finalising the booking. Reference " +
                  reference +
                  " — it will appear in your bookings shortly."
              );
            } catch {
              setPaying(false);
              setPayError(
                "Your payment may have succeeded but we lost the connection while confirming it. Quote reference " +
                  reference +
                  " to support before paying again."
              );
            }
          })();
        },
      });

      rzp.on("payment.failed", (resp: unknown) => {
        const e = resp as { error?: { description?: string } };
        trackEvent(ANALYTICS_EVENTS.payment_failure, {
          reference,
          reason: e.error?.description?.slice(0, 120) ?? "unknown",
        });
        setPaying(false);
        setPayError(
          `${e.error?.description ?? "The payment didn't go through"}. No money has left your account — you can retry below.`
        );
      });

      rzp.open();
    } catch {
      setPaying(false);
      setPayError(
        "We couldn't reach the payment service. Nothing was charged — please try again in a moment."
      );
    }
  }, [healer, type, slot, duration, fields, price]);

  /* ---------- Confirmation ---------- */
  if (confirmed && healer && type) {
    const when = new Date(confirmed.startsAt);
    return (
      <div className="mx-auto max-w-lg rounded-lg bg-surface-0 p-10 shadow-e-2 dark:bg-night-900">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-700">
          <CalendarCheck2 className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="mt-6 font-display text-2xl">
          You&rsquo;re booked, {fields.name.split(" ")[0]}.
        </h2>
        <dl className="mt-7 space-y-3 text-[0.9375rem]">
          <div className="flex justify-between gap-6">
            <dt className="text-mist-500">Reference</dt>
            <dd className="font-medium tabular-nums">{confirmed.reference}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-mist-500">Healer</dt>
            <dd className="font-medium">{healer.name}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-mist-500">Session</dt>
            <dd>{TYPE_META[type].label} · {duration} min</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-mist-500">When</dt>
            <dd className="text-right">
              {when.toLocaleString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "numeric",
                minute: "2-digit",
              })}
              <span className="block text-[0.8125rem] text-mist-500">{timezone}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-ink-900/10 pt-3 dark:border-surface-0/10">
            <dt className="text-mist-500">Paid</dt>
            {/* The confirmed amount as recorded in the database, not the
                figure this component calculated for the review screen. */}
            <dd className="font-display text-lg">{formatINR(confirmed.amountPaise)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-[0.9375rem] text-ink-600 dark:text-mist-400">
          A confirmation and receipt are on the way to {fields.email}, with a
          reminder before the session and a calendar invitation you can accept.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/bookings">Manage this booking</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/library">A practice for beforehand</Link>
          </Button>
        </div>
      </div>
    );
  }

  const grouped = (part: DayPart) => (availability?.slots ?? []).filter((s) => s.part === part);

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <ol className="mb-12 flex flex-wrap items-center gap-x-2 gap-y-3 text-sm" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[0.8125rem] tabular-nums transition-colors",
                i < step
                  ? "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900"
                  : i === step
                    ? "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900"
                    : "hairline text-mist-500"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn(i === step ? "font-medium" : "text-mist-500")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-ink-900/10 dark:bg-surface-0/15" aria-hidden />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: easeCalm }}
        >
          {/* 0 — Healer */}
          {step === 0 && (
            <fieldset>
              <legend className="font-display text-2xl">Who would you like to meet?</legend>
              <ul className="mt-8 grid gap-4 md:grid-cols-2">
                {healers.map((h) => (
                  <li key={h.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setHealer(h);
                        setType(h.sessionTypes[0] ?? null);
                        setStep(1);
                      }}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-md p-5 text-left shadow-e-1 transition-[box-shadow,transform] duration-500 ease-calm hover:-translate-y-px hover:shadow-e-2",
                        healer?.slug === h.slug ? "bg-plum-100 dark:bg-night-900" : "bg-surface-0 dark:bg-night-900"
                      )}
                    >
                      <AvatarArt name={h.name} size={48} />
                      <span>
                        <span className="block font-display text-lg">{h.name}</span>
                        <span className="block text-[0.9375rem] text-ink-600 dark:text-mist-400">{h.headline}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          {/* 1 — Session type & length */}
          {step === 1 && healer && (
            <fieldset>
              <legend className="font-display text-2xl">
                How shall you meet {healer.name.split(" ")[0]}?
              </legend>
              <div className="mt-8 flex flex-wrap gap-3">
                {healer.sessionTypes.map((t) => {
                  const Meta = TYPE_META[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      aria-pressed={type === t}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-6 py-4 transition-colors",
                        type === t
                          ? "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900"
                          : "hairline hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
                      )}
                    >
                      <Meta.icon className="h-5 w-5" aria-hidden /> {Meta.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-10 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
                Session length
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    aria-pressed={duration === d}
                    className={cn(
                      "rounded-full px-5 py-3 text-[0.9375rem] tabular-nums transition-colors",
                      duration === d
                        ? "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900"
                        : "hairline hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
                    )}
                  >
                    {d} minutes
                  </button>
                ))}
              </div>
              <p className="mt-5 text-[0.9375rem] text-mist-500">
                {formatINR(price)} · set by the healer, shown again before you pay.
              </p>

              <div className="mt-10 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
                <Button
                  onClick={() => {
                    if (!type) return;
                    // The funnel begins here: healer and session type chosen,
                    // customer now looking for a time.
                    trackEvent(ANALYTICS_EVENTS.booking_start, {
                      healer: healer.slug,
                      sessionType: type,
                      minutes: duration,
                    });
                    setStep(2);
                  }}
                  disabled={!type}
                >
                  Choose a time
                </Button>
              </div>
            </fieldset>
          )}

          {/* 2 — Date & time */}
          {step === 2 && healer && (
            <fieldset>
              <legend className="font-display text-2xl">When suits you?</legend>
              <p className="mt-2 text-[0.9375rem] text-mist-500">
                All times in your timezone — {timezone}.
              </p>

              <div className="mt-8 grid gap-12 lg:grid-cols-[auto_1fr]">
                <Calendar value={dateKey} onChange={setDateKey} />

                <div aria-live="polite" className="min-w-0">
                  {!dateKey && (
                    <p className="text-ink-600 dark:text-mist-400">
                      Pick a date to see {healer.name.split(" ")[0]}&rsquo;s open times.
                    </p>
                  )}

                  {dateKey && loadingSlots && (
                    <div className="space-y-6">
                      {DAY_PARTS.map((p) => (
                        <div key={p}>
                          <div className="h-4 w-24 animate-pulse rounded-full bg-ink-900/[0.06] dark:bg-surface-0/10" />
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="h-11 w-24 animate-pulse rounded-full bg-ink-900/[0.06] dark:bg-surface-0/10" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {dateKey && !loadingSlots && slotsError && (
                    <div className="rounded-md bg-error-50 p-6">
                      <p className="font-display text-lg text-error-700">
                        We couldn&rsquo;t load times.
                      </p>
                      <p className="mt-2 text-[0.9375rem] text-error-700">{slotsError}</p>
                      <Button
                        variant="secondary"
                        className="mt-5"
                        onClick={() => setReloadToken((n) => n + 1)}
                      >
                        Try again
                      </Button>
                    </div>
                  )}

                  {/* The database returns open times only — it never reports
                      which slots are taken, because that would expose the
                      healer's private calendar. So "no slots" needs two
                      different explanations, not one. */}
                  {dateKey && !loadingSlots && !slotsError && availability && (
                    availability.slots.length === 0 ? (
                      <div className="rounded-md bg-ink-900/[0.03] p-8 dark:bg-surface-0/[0.04]">
                        <p className="font-display text-lg">
                          {availability.unconfigured
                            ? "No times published for that day."
                            : "Fully booked that day."}
                        </p>
                        <p className="mt-2 text-ink-600 dark:text-mist-400">
                          {availability.unconfigured
                            ? `${healer.name.split(" ")[0]} hasn't opened this date yet. Try another day, or browse healers with published availability.`
                            : "Try another date — or browse healers with earlier availability."}
                        </p>
                        <Button variant="secondary" className="mt-5" asChild>
                          <Link href="/healers">See other healers</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {DAY_PARTS.map((part) => {
                          const list = grouped(part);
                          if (list.length === 0) return null;
                          return (
                            <div key={part}>
                              <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
                                {PART_LABEL[part]}
                                <span className="ml-2 normal-case tracking-normal text-mist-500/80">
                                  {list.length} open
                                </span>
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {list.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    aria-pressed={slot?.id === s.id}
                                    aria-label={`${s.label}, ${duration} minutes`}
                                    onClick={() => {
                                      setSlot(s);
                                      trackEvent(ANALYTICS_EVENTS.booking_slot_selected, {
                                        healer: healer.slug,
                                        startsAt: s.id,
                                      });
                                    }}
                                    className={cn(
                                      "h-11 rounded-full px-5 text-[0.9375rem] tabular-nums transition-colors",
                                      slot?.id !== s.id &&
                                        "hairline hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]",
                                      slot?.id === s.id &&
                                        "bg-plum-900 text-surface-0 dark:bg-surface-0 dark:text-ink-900"
                                    )}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}

                  {payError && step === 2 && (
                    <p
                      role="alert"
                      className="mt-6 rounded-sm bg-warning-50 p-4 text-[0.9375rem] text-warning-700"
                    >
                      {payError}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-12 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => slot && setStep(3)} disabled={!slot}>Your details</Button>
              </div>
            </fieldset>
          )}

          {/* 3 — Details */}
          {step === 3 && (
            <fieldset className="max-w-xl">
              <legend className="font-display text-2xl">A little about you</legend>
              <div className="mt-8 space-y-6">
                {([
                  { key: "name", label: "Your name", type: "text", autoComplete: "name" },
                  { key: "email", label: "Email", type: "email", autoComplete: "email" },
                  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
                ] as const).map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-2 block text-[0.9375rem] font-medium">{f.label}</span>
                    <input
                      type={f.type}
                      autoComplete={f.autoComplete}
                      value={fields[f.key]}
                      onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}
                      aria-invalid={Boolean(errors[f.key])}
                      aria-describedby={errors[f.key] ? `err-${f.key}` : undefined}
                      className="h-12 w-full rounded-sm bg-surface-0 px-4 shadow-e-1 outline-none dark:bg-night-900"
                    />
                    {errors[f.key] && (
                      <p id={`err-${f.key}`} className="mt-2 text-[0.875rem] text-error-700">{errors[f.key]}</p>
                    )}
                  </label>
                ))}
                <label className="block">
                  <span className="mb-2 block text-[0.9375rem] font-medium">
                    Anything your healer should know?{" "}
                    <span className="font-normal text-mist-500">Optional</span>
                  </span>
                  <textarea
                    rows={4}
                    value={fields.note}
                    onChange={(e) => setFields((v) => ({ ...v, note: e.target.value }))}
                    className="w-full rounded-sm bg-surface-0 p-4 shadow-e-1 outline-none dark:bg-night-900"
                  />
                  {errors.note && <p className="mt-2 text-[0.875rem] text-error-700">{errors.note}</p>}
                </label>
                <label className="flex items-start gap-3 text-[0.9375rem]">
                  <input
                    type="checkbox"
                    checked={fields.consent}
                    onChange={(e) => setFields((v) => ({ ...v, consent: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-[#4B0E42]"
                  />
                  <span>
                    I understand this note is shared only with my healer, kept
                    private, and used only for this session.{" "}
                    <Link href="/legal/privacy" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] dark:text-surface-0 dark:decoration-surface-0/30">
                      Privacy policy
                    </Link>
                  </span>
                </label>
                {errors.consent && <p className="text-[0.875rem] text-error-700">{errors.consent}</p>}
                <label className="flex items-start gap-3 text-[0.9375rem]">
                  <input
                    type="checkbox"
                    checked={fields.acknowledge}
                    onChange={(e) => setFields((v) => ({ ...v, acknowledge: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-[#4B0E42]"
                  />
                  <span>
                    I am 18 or older, and I understand this is a complementary
                    wellness session — not medical, psychological or emergency
                    care, and no outcome is promised.{" "}
                    <Link href="/legal/disclaimer" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] dark:text-surface-0 dark:decoration-surface-0/30">
                      Read the disclaimers
                    </Link>
                  </span>
                </label>
                {errors.acknowledge && <p className="text-[0.875rem] text-error-700">{errors.acknowledge}</p>}
              </div>
              <div className="mt-10 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                <Button
                  onClick={() => {
                    if (!validateDetails()) return;
                    trackEvent(ANALYTICS_EVENTS.booking_details_submitted);
                    setStep(4);
                  }}
                >
                  Review &amp; pay
                </Button>
              </div>
            </fieldset>
          )}

          {/* 4 — Review & pay */}
          {step === 4 && healer && type && slot && (
            <div className="max-w-xl">
              <h2 className="font-display text-2xl">One calm look before you pay</h2>
              <dl className="mt-8 space-y-3 rounded-md bg-surface-0 p-6 shadow-e-1 dark:bg-night-900">
                <div className="flex justify-between gap-6">
                  <dt className="text-mist-500">Healer</dt>
                  <dd className="font-medium">{healer.name}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-mist-500">Session</dt>
                  <dd>{TYPE_META[type].label} · {duration} min</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-mist-500">When</dt>
                  <dd className="text-right">
                    {new Date(slot.id).toLocaleString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    <span className="block text-[0.8125rem] text-mist-500">{timezone}</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-6 border-t border-ink-900/10 pt-3 dark:border-surface-0/10">
                  <dt className="text-mist-500">Total</dt>
                  <dd className="font-display text-xl">{formatINR(price)}</dd>
                </div>
              </dl>
              <ul className="mt-5 space-y-2 text-[0.9375rem] text-mist-500">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Secured by Razorpay, an RBI-authorised payment aggregator — your
                  card and UPI details never touch HealerJi.
                </li>
                <li className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {healer.name} is a certified healer, vetted in a live
                  conversation before listing.
                </li>
                <li className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Your note is shared only with your healer. Nothing is recorded.
                </li>
              </ul>
              <p className="mt-4 text-[0.9375rem] text-mist-500">
                Prices include GST; a receipt follows by email. Cancellations
                follow our{" "}
                <Link href="/legal/refunds" className="text-ink-900 underline decoration-ink-900/25 underline-offset-[5px] dark:text-surface-0 dark:decoration-surface-0/30">
                  refund policy
                </Link>
                .
              </p>
              {payError && (
                <p role="alert" className="mt-5 rounded-sm bg-error-50 p-4 text-[0.9375rem] text-error-700">
                  {payError}
                </p>
              )}
              <div className="mt-10 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setStep(3)} disabled={paying}>Back</Button>
                <Button onClick={pay} disabled={paying}>
                  {paying ? "Opening secure payment…" : payError ? `Retry payment · ${formatINR(price)}` : `Pay ${formatINR(price)}`}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
