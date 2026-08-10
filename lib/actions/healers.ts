"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import {
  createHealer, updateHealer, archiveHealer, restoreHealer,
  setHealerModalities, setHealerLanguages, inviteHealer, getHealerById,
} from "@/lib/services/healers";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import { fromPostgrestError } from "@/lib/services/types";
import { slugify } from "@/lib/format";
import type { SessionKind } from "@/lib/supabase/types";

/**
 * Healer server actions.
 *
 * Every action re-authorises. The form having been rendered proves nothing —
 * a server action is a public POST endpoint and anyone can call it with a
 * crafted payload. Beyond this check, RLS enforces the same rule again, and
 * guard_healer_self_edit() blocks a healer touching commercial fields even if
 * both application layers were wrong.
 */

export interface HealerFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  notice?: string;
}

const SESSION_KINDS = ["chat", "audio", "video"] as const;

const healerSchema = z.object({
  name: z.string().min(2, "Please give the healer's name.").max(80),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.").max(80),
  headline: z.string().max(160),
  bio: z.string().max(4000),
  gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
  years: z.coerce.number().int().min(0).max(80),
  priceRupees: z.coerce.number().min(0).max(1000000),
  avatarUrl: z.string().url().or(z.literal("")),
  avatarAlt: z.string().max(200),
  timezone: z.string().min(1),
  featured: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(9999),
  status: z.enum(["draft", "active", "inactive", "archived"]),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(180),
  verifiedIdentity: z.boolean(),
  verifiedCredentials: z.boolean(),
  verifiedInterviewed: z.boolean(),
  modalities: z.array(z.string()),
  languages: z.array(z.string()),
  sessionKinds: z.array(z.enum(SESSION_KINDS)),
  acceptingBookings: z.boolean(),
});

function parseForm(formData: FormData) {
  const bool = (key: string) => formData.get(key) === "on" || formData.get(key) === "true";
  const list = (key: string) => formData.getAll(key).map(String).filter(Boolean);
  const genderRaw = String(formData.get("gender") ?? "");

  return healerSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "") || String(formData.get("name") ?? "")),
    headline: String(formData.get("headline") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    gender: genderRaw === "" ? undefined : genderRaw,
    years: formData.get("years") ?? 0,
    priceRupees: formData.get("priceRupees") ?? 0,
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    avatarAlt: String(formData.get("avatarAlt") ?? ""),
    timezone: String(formData.get("timezone") ?? "Asia/Kolkata"),
    featured: bool("featured"),
    displayOrder: formData.get("displayOrder") ?? 0,
    status: String(formData.get("status") ?? "draft"),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    verifiedIdentity: bool("verifiedIdentity"),
    verifiedCredentials: bool("verifiedCredentials"),
    verifiedInterviewed: bool("verifiedInterviewed"),
    modalities: list("modalities"),
    languages: list("languages"),
    sessionKinds: list("sessionKinds"),
    acceptingBookings: bool("acceptingBookings"),
  });
}

function firstIssues(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Session offerings are rewritten to match the selected kinds, preserving the
 * pro-rata rule the public site already uses: the stored base rate is for 45
 * minutes, and 30 / 60 are derived from it.
 */
async function syncOfferings(
  healerId: string,
  kinds: readonly SessionKind[],
  basePricePaise: number
): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return "Supabase is not configured.";

  const { error: deactivate } = await supabase
    .from("session_offerings").update({ active: false }).eq("healer_id", healerId);
  if (deactivate) return fromPostgrestError(deactivate).error.message;

  if (kinds.length === 0) return null;

  const rows = kinds.flatMap((kind) =>
    [30, 45, 60].map((minutes) => ({
      healer_id: healerId,
      kind,
      duration_minutes: minutes,
      price_paise: Math.round((basePricePaise * minutes) / 45),
      active: true,
    }))
  );

  const { error } = await supabase
    .from("session_offerings")
    .upsert(rows, { onConflict: "healer_id,kind,duration_minutes" });
  if (error) return fromPostgrestError(error).error.message;
  return null;
}

async function saveBookingToggle(healerId: string, timezone: string, accepting: boolean) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("healer_booking_settings")
    .upsert({ healer_id: healerId, timezone, accepting_bookings: accepting }, { onConflict: "healer_id" });
}

/** Public surfaces that must reflect an edit immediately, with no redeploy. */
function revalidatePublic(slug?: string) {
  revalidatePath("/healers");
  revalidatePath("/");
  if (slug) revalidatePath(`/healers/${slug}`);
  revalidatePath("/admin/healers");
}

export async function createHealerAction(
  _prev: HealerFormState,
  formData: FormData
): Promise<HealerFormState> {
  const auth = await authorise("healers.manage");
  if (!auth.ok) return { error: auth.error };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: firstIssues(parsed.error.issues), error: "Please check the highlighted fields." };
  }
  const v = parsed.data;

  const created = await createHealer({
    name: v.name,
    slug: v.slug,
    headline: v.headline,
    bio: v.bio,
    gender: v.gender ?? null,
    years: v.years,
    price_paise: Math.round(v.priceRupees * 100),
    avatar_url: v.avatarUrl || null,
    avatar_alt: v.avatarAlt || null,
    timezone: v.timezone,
    featured: v.featured,
    display_order: v.displayOrder,
    status: v.status,
    seo_title: v.seoTitle || null,
    seo_description: v.seoDescription || null,
    verified_identity: v.verifiedIdentity,
    verified_credentials: v.verifiedCredentials,
    verified_interviewed: v.verifiedInterviewed,
    created_by: auth.viewer.id,
    updated_by: auth.viewer.id,
  });

  if (!created.ok) {
    return {
      error: created.error.code === "conflict"
        ? "That slug is already taken. Choose another."
        : created.error.message,
    };
  }

  const healer = created.data;
  await setHealerModalities(healer.id, v.modalities);
  await setHealerLanguages(healer.id, v.languages);
  const offeringError = await syncOfferings(healer.id, v.sessionKinds, healer.price_paise);
  await saveBookingToggle(healer.id, v.timezone, v.acceptingBookings);

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.healerCreated,
    resourceType: "healer",
    resourceId: healer.id,
    summary: `Created healer ${healer.name}`,
    after: { slug: healer.slug, status: healer.status, price_paise: healer.price_paise },
  });

  revalidatePublic(healer.slug);

  if (offeringError) {
    // The healer exists; be precise about what did not happen rather than
    // reporting a blanket failure and leaving the admin unsure.
    return { error: `Healer created, but session types could not be saved: ${offeringError}` };
  }
  redirect(`/admin/healers/${healer.id}?created=1`);
}

export async function updateHealerAction(
  _prev: HealerFormState,
  formData: FormData
): Promise<HealerFormState> {
  const auth = await authorise("healers.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing healer id." };

  const before = await getHealerById(id);
  if (!before.ok) return { error: before.error.message };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: firstIssues(parsed.error.issues), error: "Please check the highlighted fields." };
  }
  const v = parsed.data;

  const updated = await updateHealer(id, {
    name: v.name,
    slug: v.slug,
    headline: v.headline,
    bio: v.bio,
    gender: v.gender ?? null,
    years: v.years,
    price_paise: Math.round(v.priceRupees * 100),
    avatar_url: v.avatarUrl || null,
    avatar_alt: v.avatarAlt || null,
    timezone: v.timezone,
    featured: v.featured,
    display_order: v.displayOrder,
    status: v.status,
    seo_title: v.seoTitle || null,
    seo_description: v.seoDescription || null,
    verified_identity: v.verifiedIdentity,
    verified_credentials: v.verifiedCredentials,
    verified_interviewed: v.verifiedInterviewed,
    updated_by: auth.viewer.id,
  });

  if (!updated.ok) return { error: updated.error.message };

  await setHealerModalities(id, v.modalities);
  await setHealerLanguages(id, v.languages);
  const offeringError = await syncOfferings(id, v.sessionKinds, updated.data.price_paise);
  await saveBookingToggle(id, v.timezone, v.acceptingBookings);

  await recordAudit({
    viewer: auth.viewer,
    action: before.data.price_paise !== updated.data.price_paise
      ? AUDIT_ACTIONS.priceChanged
      : AUDIT_ACTIONS.healerUpdated,
    resourceType: "healer",
    resourceId: id,
    summary: `Updated ${updated.data.name}`,
    before: {
      status: before.data.status, price_paise: before.data.price_paise,
      featured: before.data.featured, slug: before.data.slug,
    },
    after: {
      status: updated.data.status, price_paise: updated.data.price_paise,
      featured: updated.data.featured, slug: updated.data.slug,
    },
  });

  // The old slug's page is revalidated too, or a renamed healer leaves a stale
  // page behind at the previous URL.
  revalidatePublic(before.data.slug);
  revalidatePublic(updated.data.slug);
  revalidatePath(`/admin/healers/${id}`);

  return offeringError
    ? { error: `Profile saved, but session types failed: ${offeringError}` }
    : { notice: "Saved. The public profile is updated." };
}

export async function archiveHealerAction(formData: FormData): Promise<void> {
  const auth = await authorise("healers.manage");
  if (!auth.ok) redirect("/admin/healers?error=forbidden");

  const id = String(formData.get("id") ?? "");
  const before = await getHealerById(id);
  const result = await archiveHealer(id);
  if (!result.ok) redirect(`/admin/healers/${id}?error=archive_failed`);

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.healerArchived,
    resourceType: "healer",
    resourceId: id,
    summary: `Archived ${result.data.name}`,
    before: before.ok ? { status: before.data.status } : undefined,
    after: { status: "archived" },
  });

  revalidatePublic(result.data.slug);
  redirect("/admin/healers?archived=1");
}

export async function restoreHealerAction(formData: FormData): Promise<void> {
  const auth = await authorise("healers.manage");
  if (!auth.ok) redirect("/admin/healers?error=forbidden");

  const id = String(formData.get("id") ?? "");
  const result = await restoreHealer(id);
  if (!result.ok) redirect(`/admin/healers/${id}?error=restore_failed`);

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.healerRestored,
    resourceType: "healer",
    resourceId: id,
    summary: `Restored ${result.data.name}`,
    after: { status: "inactive" },
  });

  revalidatePublic(result.data.slug);
  redirect(`/admin/healers/${id}?restored=1`);
}

export async function inviteHealerAction(
  _prev: HealerFormState,
  formData: FormData
): Promise<HealerFormState> {
  const auth = await authorise("healers.invite");
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  const parsedEmail = z.string().email().safeParse(email);
  if (!parsedEmail.success) return { error: "That email doesn't look right." };

  // Supabase creates the invited account without a password, so the link lands
  // on the password screen first; that screen forwards to the portal.
  const afterInvite = `/account/password?next=${encodeURIComponent("/healer/dashboard")}`;
  const result = await inviteHealer(
    id,
    parsedEmail.data,
    await absoluteUrl(`/auth/callback?next=${encodeURIComponent(afterInvite)}`)
  );
  if (!result.ok) {
    return {
      error: result.error.code === "not_configured"
        ? "Invitations need the Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY and redeploy."
        : result.error.message,
    };
  }

  await recordAudit({
    viewer: auth.viewer,
    action: AUDIT_ACTIONS.healerInvited,
    resourceType: "healer",
    resourceId: id,
    summary: `Invited ${parsedEmail.data} to the healer portal`,
  });

  revalidatePath(`/admin/healers/${id}`);
  return {
    notice: `Invitation sent to ${parsedEmail.data}. They choose their own password — you will never see it.`,
  };
}
