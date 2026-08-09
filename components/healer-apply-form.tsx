"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Please tell us your name."),
  email: z.string().email("That email doesn't look right."),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/, "Please enter a valid phone number."),
  modalities: z.string().min(2, "Which practices do you offer?"),
  years: z.string().regex(/^\d{1,2}$/, "Years of practice, as a number."),
  languages: z.string().min(2, "Which languages do you work in?"),
  about: z.string().min(30, "Tell us a little more — 30 characters at least."),
});

const FIELDS = [
  { key: "name", label: "Full name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone / WhatsApp", type: "tel" },
  { key: "modalities", label: "Your practices (e.g. Reiki, Chakra healing)", type: "text" },
  { key: "years", label: "Years of practice", type: "text" },
  { key: "languages", label: "Languages you heal in", type: "text" },
] as const;

export function HealerApplyForm() {
  const [fields, setFields] = useState<Record<string, string>>({
    name: "", email: "", phone: "", modalities: "", years: "", languages: "", about: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = schema.safeParse(fields);
    if (!res.success) {
      const map: Record<string, string> = {};
      for (const i of res.error.issues) map[String(i.path[0])] = i.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setServerError(null);
    setStatus("sending");
    const resp = await fetch("/api/healer-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, years: Number(fields.years) }),
    }).catch(() => null);
    if (!resp?.ok) {
      const data = (await resp?.json().catch(() => null)) as { error?: string } | null;
      setServerError(data?.error ?? "We couldn't submit that just now — please email support@healerji.com.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p role="status" className="rounded-md bg-success-50 p-6 text-success-700">
        Thank you — your application is with our vetting team. Expect an email
        about the next step (a conversation, not an exam) within a few working days.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1.5 block text-sm font-medium">{f.label}</span>
            <input
              type={f.type}
              value={fields[f.key]}
              onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}
              aria-invalid={Boolean(errors[f.key])}
              className="h-12 w-full rounded-sm bg-surface-0 px-4 shadow-e-1 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
            />
            {errors[f.key] && <p className="mt-1.5 text-sm text-error-600">{errors[f.key]}</p>}
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">About your practice — how you work, who you help</span>
        <textarea
          rows={5}
          value={fields.about}
          onChange={(e) => setFields((v) => ({ ...v, about: e.target.value }))}
          aria-invalid={Boolean(errors.about)}
          className="w-full rounded-sm bg-surface-0 p-4 shadow-e-1 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
        />
        {errors.about && <p className="mt-1.5 text-sm text-error-600">{errors.about}</p>}
      </label>
      {serverError && <p role="alert" className="rounded-sm bg-error-50 p-4 text-sm text-error-700">{serverError}</p>}
      <Button size="lg" disabled={status === "sending"}>{status === "sending" ? "Submitting…" : "Apply to join the panel"}</Button>
    </form>
  );
}
