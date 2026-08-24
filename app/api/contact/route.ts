import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { saveContactMessage } from "@/lib/services/submissions";
import {
  consumeRateLimit,
  clientIpFrom,
  tooManyRequests,
  RATE_LIMITS,
} from "@/lib/services/rate-limit";

/**
 * Contact form.
 *
 * Two things changed here after the production audit:
 *
 *   HJ-06  The message is persisted before anything is emailed. This route used
 *          to be a pure mail relay, so a Resend outage or a deleted mail
 *          destroyed the only copy. contact_messages already existed in the
 *          schema and in RLS; nothing had ever written to it.
 *
 *   HJ-05  Nothing was rate limited, so this was an uncapped path to the
 *          support inbox and to the Resend quota. There are now per-IP and
 *          per-email caps plus a honeypot.
 *
 * Persistence decides the response. Email is best-effort: a submission that is
 * safely stored but not yet emailed is a success from the sender's point of
 * view, and the record is there to act on.
 */
const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  topic: z.string().min(2).max(80),
  message: z.string().min(10).max(4000),
  // Honeypot. Real people never see this field; bots fill everything in.
  company: z.string().max(200).optional(),
});

const GENERIC_OK = { ok: true } as const;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { name, email, topic, message, company } = parsed.data;

  // Answer a bot exactly as we answer a person, so filling the trap teaches it
  // nothing. Nothing is stored and nothing is sent.
  if (company && company.trim().length > 0) {
    return NextResponse.json(GENERIC_OK);
  }

  const ip = clientIpFrom(req.headers);
  const byIp = await consumeRateLimit(RATE_LIMITS.contactPerIp, ip);
  if (!byIp.allowed) {
    return tooManyRequests(byIp, "That's a lot of messages. Please try again shortly.");
  }

  // A second bucket on the address, so rotating IPs does not lift the cap.
  const byEmail = await consumeRateLimit(RATE_LIMITS.contactPerEmail, email);
  if (!byEmail.allowed) {
    return tooManyRequests(byEmail, "We've already got your message — we'll be in touch.");
  }

  const saved = await saveContactMessage({ name, email, topic, message });
  if (!saved.ok) {
    return NextResponse.json(
      { error: "We couldn't send that just now — please try again, or email support@healerji.com." },
      { status: 503 }
    );
  }

  // From here the message is safe. Email failures are logged, not surfaced.
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[contact] stored but not emailed — RESEND_API_KEY unset", saved.data.id);
    return NextResponse.json(GENERIC_OK);
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "HealerJi Website <website@healerji.com>",
      to: [process.env.RESEND_SUPPORT_INBOX ?? "support@healerji.com"],
      replyTo: email,
      subject: `[${topic}] from ${name}`,
      text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}\n\n—\nStored as contact_messages.id ${saved.data.id}`,
    });
    if (error) {
      console.error("[contact] stored but email failed", saved.data.id, error.message);
    }
  } catch (error) {
    console.error("[contact] stored but email threw", saved.data.id, error);
  }

  return NextResponse.json(GENERIC_OK);
}
