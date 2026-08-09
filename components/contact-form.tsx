"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Please tell us your name."),
  email: z.string().email("That email doesn't look right."),
  topic: z.string().min(2, "Please choose a topic."),
  message: z.string().min(10, "Please give us a little more detail."),
});

export function ContactForm({ topics }: { topics: string[] }) {
  const [fields, setFields] = useState({ name: "", email: "", topic: topics[0] ?? "General", message: "" });
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
    const resp = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).catch(() => null);
    if (!resp?.ok) {
      const data = (await resp?.json().catch(() => null)) as { error?: string } | null;
      setServerError(data?.error ?? "We couldn't send that just now — please email support@healerji.com.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p role="status" className="rounded-md bg-success-50 p-6 text-success-700">
        Received, {fields.name.split(" ")[0]} — our team replies by email, usually within a working day.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Your name</span>
          <input
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
            aria-invalid={Boolean(errors.name)}
            className="h-12 w-full rounded-sm bg-surface-0 px-4 shadow-e-1 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
          />
          {errors.name && <p className="mt-1.5 text-sm text-error-600">{errors.name}</p>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email</span>
          <input
            type="email"
            value={fields.email}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
            aria-invalid={Boolean(errors.email)}
            className="h-12 w-full rounded-sm bg-surface-0 px-4 shadow-e-1 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
          />
          {errors.email && <p className="mt-1.5 text-sm text-error-600">{errors.email}</p>}
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Topic</span>
        <select
          value={fields.topic}
          onChange={(e) => setFields((f) => ({ ...f, topic: e.target.value }))}
          className="h-12 w-full rounded-sm bg-surface-0 px-4 shadow-e-1 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
        >
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Message</span>
        <textarea
          rows={5}
          value={fields.message}
          onChange={(e) => setFields((f) => ({ ...f, message: e.target.value }))}
          aria-invalid={Boolean(errors.message)}
          className="w-full rounded-sm bg-surface-0 p-4 shadow-e-1 outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-900"
        />
        {errors.message && <p className="mt-1.5 text-sm text-error-600">{errors.message}</p>}
      </label>
      {serverError && <p role="alert" className="rounded-sm bg-error-50 p-4 text-sm text-error-700">{serverError}</p>}
      <Button disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send message"}</Button>
    </form>
  );
}
