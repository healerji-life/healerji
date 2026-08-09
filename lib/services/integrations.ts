import "server-only";

/**
 * Integration state.
 *
 * Requirements 41 and 63: where credentials are absent the platform says so
 * plainly. It never simulates a successful external call, and it never renders
 * a number that did not come from a real record.
 *
 * Requirement 39: this reports whether a secret is present. It never returns
 * the secret itself, so it is safe to serialise into an admin screen.
 */

export type IntegrationId =
  | "supabase"
  | "supabase_admin"
  | "razorpay"
  | "razorpay_webhook"
  | "resend"
  | "cloudinary"
  | "google_oauth"
  | "google_analytics";

export interface IntegrationStatus {
  id: IntegrationId;
  label: string;
  configured: boolean;
  /** What stops it working, phrased for an operator rather than a developer. */
  missing: string[];
  purpose: string;
  docs?: string;
}

const present = (name: string): boolean => {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
};

const check = (
  id: IntegrationId,
  label: string,
  purpose: string,
  required: string[],
  docs?: string
): IntegrationStatus => {
  const missing = required.filter((n) => !present(n));
  return { id, label, purpose, configured: missing.length === 0, missing, ...(docs ? { docs } : {}) };
};

export function integrationStatuses(): IntegrationStatus[] {
  return [
    check("supabase", "Supabase (public)", "Database and authentication.",
      ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
    check("supabase_admin", "Supabase (service role)", "Server-side writes: webhooks, analytics ingestion, exports.",
      ["SUPABASE_SERVICE_ROLE_KEY"]),
    check("razorpay", "Razorpay", "Taking payments for sessions.",
      ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "NEXT_PUBLIC_RAZORPAY_KEY_ID"]),
    check("razorpay_webhook", "Razorpay webhooks", "Server-verified payment confirmation.",
      ["RAZORPAY_WEBHOOK_SECRET"]),
    check("resend", "Resend", "Transactional email: booking confirmations, invitations.",
      ["RESEND_API_KEY"]),
    check("cloudinary", "Cloudinary", "Healer photographs and article cover images.",
      ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]),
    check("google_oauth", "Google sign-in", "Optional social sign-in for customers.",
      ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      "Also enable the Google provider in Supabase Dashboard → Authentication → Providers."),
    check("google_analytics", "Google Analytics", "Optional second analytics source. HealerJi's own events do not depend on it.",
      ["NEXT_PUBLIC_GA_MEASUREMENT_ID"]),
  ];
}

export function isConfigured(id: IntegrationId): boolean {
  return integrationStatuses().find((s) => s.id === id)?.configured ?? false;
}
