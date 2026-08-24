import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { err, fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";

/**
 * Public form submissions.
 *
 * /api/contact and /api/healer-apply used to be pure mail relays: they emailed
 * support@healerji.com and stored nothing. The tables designed for them —
 * contact_messages and healer_applications — existed in the schema, in RLS and
 * in the generated types, and no code ever touched them. A Resend outage, a
 * bounced message or a deleted mail destroyed the only copy of a healer's
 * application.
 *
 * The order is now persist-then-notify. Persistence decides the response;
 * email is best-effort, exactly as notifyBookingConfirmed treats a receipt.
 *
 * Writes use the service role because RLS grants anon no INSERT on either
 * table — a visitor must not be able to write arbitrary rows, and these are
 * the only two paths that may.
 */

export interface ContactSubmission {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export interface HealerApplicationSubmission {
  name: string;
  email: string;
  phone: string;
  modalities: string;
  years: number;
  languages: string;
  about: string;
}

export async function saveContactMessage(
  input: ContactSubmission
): Promise<Result<{ id: string }>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { data, error } = await admin
    .from("contact_messages")
    .insert({
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[contact] could not persist message", error.message);
    return err("unknown", "We couldn't record that message.");
  }
  return ok({ id: data.id });
}

export async function saveHealerApplication(
  input: HealerApplicationSubmission
): Promise<Result<{ id: string }>> {
  const admin = createAdminClient();
  if (!admin) return NOT_CONFIGURED("Supabase service role");

  const { data, error } = await admin
    .from("healer_applications")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      modalities: input.modalities,
      years: input.years,
      languages: input.languages,
      about: input.about,
      // status defaults to 'new' — the admin queue reads this.
    })
    .select("id")
    .single();

  if (error) {
    console.error("[healer-apply] could not persist application", error.message);
    return err("unknown", "We couldn't record that application.");
  }
  return ok({ id: data.id });
}

// --------------------------------------------------------- admin reading ----

export interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  handled_at: string | null;
  created_at: string;
}

export interface HealerApplicationRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  modalities: string;
  years: number | null;
  languages: string | null;
  about: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * Both queues for the admin inbox.
 *
 * Read with the caller's own client, not the service role: RLS on both tables
 * already restricts them to staff, so this stays subject to the same rule as
 * every other admin screen rather than quietly bypassing it.
 */
export async function listSubmissionsForAdmin(): Promise<
  Result<{ applications: HealerApplicationRecord[]; messages: ContactMessageRecord[] }>
> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  // Independent queries, so they run concurrently rather than in sequence.
  const [applications, messages] = await Promise.all([
    supabase
      .from("healer_applications")
      .select("id, name, email, phone, modalities, years, languages, about, status, reviewed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("contact_messages")
      .select("id, name, email, topic, message, handled_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (applications.error) {
    return fromPostgrestError(applications.error, "We couldn't load healer applications.");
  }
  if (messages.error) {
    return fromPostgrestError(messages.error, "We couldn't load contact messages.");
  }

  return ok({
    applications: (applications.data ?? []) as HealerApplicationRecord[],
    messages: (messages.data ?? []) as ContactMessageRecord[],
  });
}
