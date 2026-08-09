import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  topic: z.string().min(2).max(80),
  message: z.string().min(10).max(4000),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "The contact form isn't configured on this deployment yet — please email support@healerji.com directly." },
      { status: 503 }
    );
  }
  const resend = new Resend(key);
  const { name, email, topic, message } = parsed.data;
  const { error } = await resend.emails.send({
    from: "HealerJi Website <website@healerji.com>",
    to: ["support@healerji.com"],
    replyTo: email,
    subject: `[${topic}] from ${name}`,
    text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
  });
  if (error) {
    return NextResponse.json({ error: "We couldn't send that just now — please try again, or email support@healerji.com." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
