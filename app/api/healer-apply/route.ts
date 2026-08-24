import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { saveHealerApplication } from "@/lib/services/submissions";
import {
  consumeRateLimit,
  clientIpFrom,
  tooManyRequests,
  RATE_LIMITS,
} from "@/lib/services/rate-limit";

/**
 * Healer application.
 *
 * Same two fixes as the contact form, and they matter more here: an
 * application is someone asking to join the platform, and this route used to
 * turn it into a single unacknowledged email with no record, no queue and no
 * follow-up state. healer_applications already existed, with a status column
 * and a reviewer, and nothing had ever written to it.
 *
 * Applications land as status 'new' for the admin queue.
 */
const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/, "phone"),
  modalities: z.string().min(2).max(300),
  years: z.coerce.number().min(0).max(60),
  languages: z.string().min(2).max(200),
  about: z.string().min(30).max(4000),
  // Honeypot; see the contact route.
  company: z.string().max(200).optional(),
});

const GENERIC_OK = { ok: true } as const;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the highlighted fields and try again." },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (d.company && d.company.trim().length > 0) {
    return NextResponse.json(GENERIC_OK);
  }

  const ip = clientIpFrom(req.headers);
  const byIp = await consumeRateLimit(RATE_LIMITS.applyPerIp, ip);
  if (!byIp.allowed) {
    return tooManyRequests(byIp, "We've received your application. Please give us a little time.");
  }

  const byEmail = await consumeRateLimit(RATE_LIMITS.applyPerEmail, d.email);
  if (!byEmail.allowed) {
    return tooManyRequests(byEmail, "We've already got your application — we'll be in touch.");
  }

  const saved = await saveHealerApplication({
    name: d.name,
    email: d.email,
    phone: d.phone,
    modalities: d.modalities,
    years: d.years,
    languages: d.languages,
    about: d.about,
  });
  if (!saved.ok) {
    return NextResponse.json(
      { error: "We couldn't submit that just now — please try again, or email support@healerji.com." },
      { status: 503 }
    );
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[healer-apply] stored but not emailed — RESEND_API_KEY unset", saved.data.id);
    return NextResponse.json(GENERIC_OK);
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "HealerJi Applications <website@healerji.com>",
      to: [process.env.RESEND_SUPPORT_INBOX ?? "support@healerji.com"],
      replyTo: d.email,
      subject: `Healer application — ${d.name}`,
      text:
        `Name: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone}\n` +
        `Modalities: ${d.modalities}\nYears of practice: ${d.years}\nLanguages: ${d.languages}\n\n` +
        `About:\n${d.about}\n\n—\nStored as healer_applications.id ${saved.data.id}`,
    });
    if (error) {
      console.error("[healer-apply] stored but email failed", saved.data.id, error.message);
    }
  } catch (error) {
    console.error("[healer-apply] stored but email threw", saved.data.id, error);
  }

  return NextResponse.json(GENERIC_OK);
}
