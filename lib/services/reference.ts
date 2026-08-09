import { createClient } from "@/lib/supabase/server";
import { fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";

/** Reference taxonomies, used to populate admin form controls. */

export interface ModalityOption { slug: string; name: string }
export interface LanguageOption { code: string; name: string }

export async function listModalities(): Promise<Result<ModalityOption[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("modalities").select("slug, name").eq("status", "active")
    .order("display_order").order("name");
  if (error) return fromPostgrestError(error);
  return ok(data ?? []);
}

export async function listLanguages(): Promise<Result<LanguageOption[]>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");
  const { data, error } = await supabase
    .from("languages").select("code, name").order("display_order").order("name");
  if (error) return fromPostgrestError(error);
  return ok(data ?? []);
}

export async function getHealerRelations(healerId: string): Promise<Result<{
  modalitySlugs: string[];
  languageCodes: string[];
  sessionKinds: string[];
  acceptingBookings: boolean;
}>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const [mods, langs, offerings, settings] = await Promise.all([
    supabase.from("healer_modalities").select("modality_slug").eq("healer_id", healerId).order("display_order"),
    supabase.from("healer_languages").select("language_code").eq("healer_id", healerId).order("display_order"),
    supabase.from("session_offerings").select("kind").eq("healer_id", healerId).eq("active", true),
    supabase.from("healer_booking_settings").select("accepting_bookings").eq("healer_id", healerId).maybeSingle(),
  ]);

  if (mods.error) return fromPostgrestError(mods.error);
  if (langs.error) return fromPostgrestError(langs.error);

  return ok({
    modalitySlugs: (mods.data ?? []).map((m) => m.modality_slug),
    languageCodes: (langs.data ?? []).map((l) => l.language_code),
    sessionKinds: [...new Set((offerings.data ?? []).map((o) => o.kind as string))],
    acceptingBookings: settings.data?.accepting_bookings ?? false,
  });
}
