import "server-only";
import { Resend } from "resend";
import { err, ok, type Result } from "@/lib/services/types";
import { formatPaise } from "@/lib/format";

/**
 * Transactional email.
 *
 * Every send originates here, on the server. Nothing in the browser can trigger
 * a send, and RESEND_API_KEY is never read outside this module.
 *
 * Two design rules:
 *
 *   1. An email failure must NEVER fail the operation that triggered it. A
 *      customer who has paid is booked whether or not the receipt sends. Callers
 *      get a Result they may ignore, and failures are logged server-side.
 *   2. Nothing is faked. With no RESEND_API_KEY the functions return
 *      not_configured — they do not log "email sent" and move on.
 *
 * Plain-text bodies alongside HTML: some people read mail in a terminal, and a
 * text part materially improves deliverability.
 */

const BRAND = { plum: "#4B0E42", orchid: "#BE3A95", ink: "#141414", mist: "#887785" };

export interface EmailResult {
  id: string | null;
  delivered: boolean;
}

function client(): { resend: Resend; from: string } | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const from = process.env.RESEND_FROM_EMAIL ?? "HealerJi <hello@healerji.com>";
  return { resend: new Resend(key), from };
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function dispatch(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<Result<EmailResult>> {
  const config = client();
  if (!config) {
    // Deliberately explicit. The caller logs this; nothing pretends to have sent.
    return err(
      "not_configured",
      "Email is not configured on this deployment.",
      "Set RESEND_API_KEY and RESEND_FROM_EMAIL."
    );
  }

  try {
    const { data, error } = await config.resend.emails.send({
      from: config.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (error) return err("upstream", "The email provider rejected that message.", error.message);
    return ok({ id: data?.id ?? null, delivered: true });
  } catch (caught) {
    return err(
      "upstream",
      "We couldn't reach the email provider.",
      caught instanceof Error ? caught.message : undefined
    );
  }
}

// --------------------------------------------------------------- templates ----

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shell for every message.
 *
 * Table-based and inline-styled on purpose: Gmail strips <style> blocks and
 * Outlook ignores most flexbox, so anything cleverer would break for a large
 * share of recipients.
 */
function shell(heading: string, body: string, footerNote?: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8F7F8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F8;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:28px 32px 0;">
    <p style="margin:0;font:600 11px/1 -apple-system,system-ui,sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.orchid};">HealerJi</p>
    <h1 style="margin:14px 0 0;font:400 24px/1.25 Georgia,serif;color:${BRAND.ink};">${escapeHtml(heading)}</h1>
  </td></tr>
  <tr><td style="padding:8px 32px 28px;font:400 15px/1.65 -apple-system,system-ui,sans-serif;color:${BRAND.ink};">
    ${body}
  </td></tr>
  <tr><td style="padding:20px 32px;background:#F8F7F8;font:400 12px/1.6 -apple-system,system-ui,sans-serif;color:${BRAND.mist};">
    ${footerNote ? `<p style="margin:0 0 8px;">${footerNote}</p>` : ""}
    <p style="margin:0;">HealerJi · complementary wellness sessions. Not medical, psychological or emergency care.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:${BRAND.mist};font:400 14px/1.5 -apple-system,system-ui,sans-serif;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;text-align:right;font:500 14px/1.5 -apple-system,system-ui,sans-serif;color:${BRAND.ink};">${escapeHtml(value)}</td>
  </tr>`;
}

export interface BookingEmailContext {
  reference: string;
  customerName: string;
  customerEmail: string;
  healerName: string;
  healerEmail?: string;
  sessionKind: string;
  durationMinutes: number;
  startsAt: string;
  amountPaise: number;
  customerNote?: string | null;
  timezone?: string;
}

function formatWhen(iso: string, timezone = "Asia/Kolkata"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: timezone,
  });
}

// ------------------------------------------------------------- customer -------

/** Sent only after a payment has been verified server-side. */
export async function sendBookingConfirmation(ctx: BookingEmailContext): Promise<Result<EmailResult>> {
  const when = formatWhen(ctx.startsAt, ctx.timezone);
  const firstName = ctx.customerName.split(" ")[0] ?? ctx.customerName;

  const body = `
    <p style="margin:0 0 16px;">Your session is confirmed. Here is everything in one place.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("Reference", ctx.reference)}
      ${detailRow("Healer", ctx.healerName)}
      ${detailRow("Session", `${ctx.sessionKind} · ${ctx.durationMinutes} minutes`)}
      ${detailRow("When", when)}
      ${detailRow("Paid", formatPaise(ctx.amountPaise))}
    </table>
    <p style="margin:0 0 12px;">Find somewhere quiet a few minutes beforehand. There is nothing to prepare and nothing to get right.</p>
    <p style="margin:0;">To reschedule or cancel, sign in and open your bookings. Quote <strong>${escapeHtml(ctx.reference)}</strong> if you need us.</p>`;

  const text = [
    `You're booked, ${firstName}.`,
    ``,
    `Reference: ${ctx.reference}`,
    `Healer: ${ctx.healerName}`,
    `Session: ${ctx.sessionKind}, ${ctx.durationMinutes} minutes`,
    `When: ${when}`,
    `Paid: ${formatPaise(ctx.amountPaise)}`,
    ``,
    `To reschedule or cancel, sign in and open your bookings.`,
    ``,
    `HealerJi offers complementary wellness sessions. Not medical, psychological or emergency care.`,
  ].join("\n");

  return dispatch({
    to: ctx.customerEmail,
    subject: `You're booked — ${ctx.healerName}, ${when}`,
    html: shell(`You're booked, ${firstName}.`, body, "A reminder follows before your session."),
    text,
  });
}

export async function sendCancellationToCustomer(
  ctx: BookingEmailContext & { refundNote: string }
): Promise<Result<EmailResult>> {
  const when = formatWhen(ctx.startsAt, ctx.timezone);
  const body = `
    <p style="margin:0 0 16px;">Your session with ${escapeHtml(ctx.healerName)} on ${escapeHtml(when)} has been cancelled.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("Reference", ctx.reference)}
      ${detailRow("Amount", formatPaise(ctx.amountPaise))}
    </table>
    <p style="margin:0 0 12px;">${escapeHtml(ctx.refundNote)}</p>
    <p style="margin:0;">If you would like a different time, our healers&rsquo; calendars are open.</p>`;

  return dispatch({
    to: ctx.customerEmail,
    subject: `Cancelled — ${ctx.reference}`,
    html: shell("Your session is cancelled.", body),
    text: `Your session with ${ctx.healerName} on ${when} is cancelled.\n\nReference: ${ctx.reference}\n${ctx.refundNote}`,
  });
}

// --------------------------------------------------------------- healer -------

/**
 * The healer's copy.
 *
 * Note what it does not contain: no amount, no payment identifier, no customer
 * phone. The healer needs to know who is coming and when — the money is between
 * the customer and HealerJi. This mirrors the same boundary enforced in the
 * healer portal.
 */
export async function sendNewSessionToHealer(ctx: BookingEmailContext): Promise<Result<EmailResult>> {
  if (!ctx.healerEmail) {
    return err("validation", "That healer has no email address on file.");
  }

  const when = formatWhen(ctx.startsAt, ctx.timezone);
  const body = `
    <p style="margin:0 0 16px;">A new session has been booked with you.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("When", when)}
      ${detailRow("With", ctx.customerName)}
      ${detailRow("Session", `${ctx.sessionKind} · ${ctx.durationMinutes} minutes`)}
      ${detailRow("Reference", ctx.reference)}
    </table>
    ${ctx.customerNote
      ? `<p style="margin:0 0 6px;color:${BRAND.mist};font-size:13px;">What they'd like you to know</p>
         <p style="margin:0 0 16px;padding:12px 14px;background:#F8F7F8;border-radius:8px;">${escapeHtml(ctx.customerNote)}</p>`
      : ""}
    <p style="margin:0;">It is on your calendar in the healer portal.</p>`;

  return dispatch({
    to: ctx.healerEmail,
    subject: `New session — ${when}`,
    html: shell("A new session.", body),
    text: [
      `A new session has been booked with you.`,
      ``,
      `When: ${when}`,
      `With: ${ctx.customerName}`,
      `Session: ${ctx.sessionKind}, ${ctx.durationMinutes} minutes`,
      `Reference: ${ctx.reference}`,
      ctx.customerNote ? `\nWhat they'd like you to know:\n${ctx.customerNote}` : "",
    ].join("\n"),
  });
}

export async function sendCancellationToHealer(ctx: BookingEmailContext): Promise<Result<EmailResult>> {
  if (!ctx.healerEmail) return err("validation", "That healer has no email address on file.");

  const when = formatWhen(ctx.startsAt, ctx.timezone);
  const body = `
    <p style="margin:0 0 16px;">A session has been cancelled, and the time is free again on your calendar.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${detailRow("Was", when)}
      ${detailRow("With", ctx.customerName)}
      ${detailRow("Reference", ctx.reference)}
    </table>`;

  return dispatch({
    to: ctx.healerEmail,
    subject: `Cancelled — ${when}`,
    html: shell("A session was cancelled.", body),
    text: `A session has been cancelled.\n\nWas: ${when}\nWith: ${ctx.customerName}\nReference: ${ctx.reference}`,
  });
}

/**
 * Healer invitation.
 *
 * Contains no password and no token beyond Supabase's own single-use link.
 */
export async function sendHealerInvitation(params: {
  email: string;
  healerName: string;
  inviteUrl: string;
}): Promise<Result<EmailResult>> {
  const body = `
    <p style="margin:0 0 16px;">You have been invited to the HealerJi healer portal, where you set your own availability and see the sessions you are holding.</p>
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(params.inviteUrl)}" style="display:inline-block;background:${BRAND.plum};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font:500 15px -apple-system,system-ui,sans-serif;">Set up your account</a>
    </p>
    <p style="margin:0;color:${BRAND.mist};font-size:13px;">You choose your own password — nobody at HealerJi can see it. This link can be used once.</p>`;

  return dispatch({
    to: params.email,
    subject: "Your HealerJi healer portal invitation",
    html: shell(`Welcome, ${params.healerName}.`, body),
    text: `You have been invited to the HealerJi healer portal.\n\nSet up your account: ${params.inviteUrl}\n\nYou choose your own password. This link can be used once.`,
  });
}
