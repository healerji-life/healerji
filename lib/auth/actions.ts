"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Authentication server actions.
 *
 * Passwords are handled entirely by Supabase Auth: nothing here hashes,
 * stores, compares or logs one. There is no admin credential in an
 * environment variable — an administrator is a real account holding the
 * super_admin role in user_roles.
 */

export interface AuthFormState {
  error?: string;
  notice?: string;
}

const credentials = z.object({
  email: z.string().email("That email doesn't look right."),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

/**
 * Sign-in errors are deliberately identical for "no such account" and "wrong
 * password". Distinguishing them would turn this form into a way to discover
 * who has an account here — which, for a healing platform, is sensitive in
 * itself.
 */
const GENERIC_SIGNIN_ERROR = "That email and password don't match. Please try again.";

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Sign-in isn't configured on this deployment yet." };

  const parsed = credentials.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: GENERIC_SIGNIN_ERROR };

  const next = String(formData.get("next") ?? "");
  revalidatePath("/", "layout");
  redirect(isSafeRedirect(next) ? next : "/");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Sign-up isn't configured on this deployment yet." };

  const parsed = credentials
    .extend({ fullName: z.string().min(2, "Please tell us your name.").max(80) })
    .safeParse({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      fullName: String(formData.get("fullName") ?? "").trim(),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: await absoluteUrl("/auth/callback"),
    },
  });

  if (error) {
    // Same reasoning as sign-in: "already registered" is not ours to disclose.
    return {
      notice: "Check your email — if that address can be used, a confirmation link is on its way.",
    };
  }

  return { notice: "Almost there. Open the confirmation link we've emailed you." };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Password reset isn't configured on this deployment yet." };

  const email = String(formData.get("email") ?? "").trim();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { error: "That email doesn't look right." };

  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: await absoluteUrl("/auth/callback?next=/account/password"),
  });

  // Always the same answer, whether or not the account exists.
  return { notice: "If that address has an account, a reset link is on its way." };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Not configured." };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Passwords need at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  // updateUser acts on the session the callback established, so this only ever
  // changes the password of whoever holds the link — there is no user id here
  // for a caller to tamper with.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We couldn't change your password. The link may have expired." };

  // An invited admin or healer arrives here with a session but no password.
  // Once they have one, send them on to the portal they were invited to
  // rather than leaving them on a form with nothing left to do.
  const next = String(formData.get("next") ?? "");
  revalidatePath("/", "layout");
  if (isSafeRedirect(next)) redirect(next);

  return { notice: "Your password has been changed." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) redirect("/signin?reason=unconfigured");

  const next = String(formData.get("next") ?? "/");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await absoluteUrl(
        `/auth/callback?next=${encodeURIComponent(isSafeRedirect(next) ? next : "/")}`
      ),
      // Only what is needed to create an account. No Drive, no contacts,
      // no calendar — requirement 18.
      scopes: "openid email profile",
    },
  });

  if (error || !data.url) redirect("/signin?reason=oauth_failed");
  redirect(data.url);
}

/**
 * Open-redirect guard. `next` arrives in a query string, so it is attacker
 * controlled; only same-site absolute paths are ever followed.
 */
function isSafeRedirect(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}
