import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/, "phone"),
  modalities: z.string().min(2).max(300),
  years: z.coerce.number().min(0).max(60),
  languages: z.string().min(2).max(200),
  about: z.string().min(30).max(4000),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields and try again." }, { status: 400 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Applications aren't configured on this deployment yet — please email support@healerji.com with your details." },
      { status: 503 }
    );
  }
  const resend = new Resend(key);
  const d = parsed.data;
  const { error } = await resend.emails.send({
    from: "HealerJi Applications <website@healerji.com>",
    to: ["support@healerji.com"],
    replyTo: d.email,
    subject: `Healer application — ${d.name}`,
    text: `Name: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone}\nModalities: ${d.modalities}\nYears of practice: ${d.years}\nLanguages: ${d.languages}\n\nAbout:\n${d.about}`,
  });
  if (error) {
    return NextResponse.json({ error: "We couldn't submit that just now — please try again, or email support@healerji.com." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
