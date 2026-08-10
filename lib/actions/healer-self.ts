"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHealerActor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site-url";
import { setHealerLanguages, setHealerModalities } from "@/lib/services/healers";
import { fromPostgrestError } from "@/lib/services/types";

/**
 * A healer editing their own profile.
 *
 * This action can only write descriptive fields. It never sends price, featured,
 * display_order, status, slug, rating, reviews_count, or any verification flag —
 * and if it tried, guard_healer_self_edit() in the database would raise 42501.
 * That trigger is the actual control; the narrow patch below is simply honest
 * about intent.
 *
 * The healer id comes from the session, never the form, so a crafted POST cannot
 * target another healer.
 */

export interface HealerSelfState {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string>;
}

const profileSchema = z.object({
  headline: z.string().max(160),
  bio: z.string().min(0).max(4000),
  avatarUrl: z.string().url().or(z.literal("")),
  avatarAlt: z.string().max(200),
  languages: z.array(z.string().max(8)).max(20),
  modalities: z.array(z.string().max(80)).max(20),
});

export async function saveHealerProfileAction(
  _prev: HealerSelfState,
  formData: FormData
): Promise<HealerSelfState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  const parsed = profileSchema.safeParse({
    headline: String(formData.get("headline") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    avatarAlt: String(formData.get("avatarAlt") ?? ""),
    languages: formData.getAll("languages").map(String).filter(Boolean),
    modalities: formData.getAll("modalities").map(String).filter(Boolean),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  const v = parsed.data;

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { error } = await supabase
    .from("healers")
    .update({
      headline: v.headline,
      bio: v.bio,
      avatar_url: v.avatarUrl || null,
      avatar_alt: v.avatarAlt || null,
      updated_by: actor.viewer.id,
    })
    .eq("id", actor.healerId);

  if (error) {
    const mapped = fromPostgrestError(error);
    return {
      error:
        mapped.error.code === "forbidden"
          ? "Some of those fields are set by HealerJi and can't be changed here."
          : "Couldn't save your profile. Please try again.",
    };
  }

  const langs = await setHealerLanguages(actor.healerId, v.languages);
  const mods = await setHealerModalities(actor.healerId, v.modalities);

  revalidatePath("/healers");
  if (actor.healerSlug) revalidatePath(`/healers/${actor.healerSlug}`);
  revalidatePath("/healer/profile");
  revalidatePath("/healer/dashboard");

  if (!langs.ok || !mods.ok) {
    return { error: "Your profile saved, but languages or practices didn't. Please try those again." };
  }

  return { notice: "Saved. Your public profile is updated." };
}

/** Account preferences that live on the profile row, not the healer row. */
const accountSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().max(20),
  marketingOptIn: z.boolean(),
});

export async function saveHealerAccountAction(
  _prev: HealerSelfState,
  formData: FormData
): Promise<HealerSelfState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  const parsed = accountSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    marketingOptIn: formData.get("marketingOptIn") === "on",
  });

  if (!parsed.success) return { error: "Please give a name of at least two characters." };

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  // guard_profile_self_edit() blocks status, email, provider and last_sign_in_at,
  // so only these three are attempted.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      marketing_opt_in: parsed.data.marketingOptIn,
    })
    .eq("id", actor.viewer.id);

  if (error) return { error: "Couldn't save your details. Please try again." };

  revalidatePath("/healer/settings");
  revalidatePath("/healer/dashboard");
  return { notice: "Saved." };
}

/**
 * Sends the healer a password-reset email.
 *
 * Deliberately not a "change password" form: routing it through Supabase's
 * emailed link means this application never handles a password, and a stolen
 * portal session cannot be used to lock the real healer out.
 */
export async function requestHealerPasswordResetAction(
  _prev: HealerSelfState,
  formData: FormData
): Promise<HealerSelfState> {
  const actor = await requireHealerActor();
  if (!actor.ok) return { error: actor.error };

  const supabase = await createClient();
  if (!supabase) return { error: "This deployment isn't configured yet." };

  const { error } = await supabase.auth.resetPasswordForEmail(actor.viewer.email, {
    redirectTo: await absoluteUrl("/auth/callback?next=/healer/settings"),
  });

  if (error) return { error: "Couldn't send that email just now. Please try again." };
  return { notice: `A password reset link is on its way to ${actor.viewer.email}.` };
}
