/**
 * App distribution — the single source of truth.
 *
 * Every download control on the site reads from here. Package ids and
 * store URLs are never written inline again, so they cannot drift
 * apart between the hero, the app page and the footer.
 */
export const ANDROID_PACKAGE = "com.user.healerji";

export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * The iOS listing URL is not yet confirmed. Rather than invent an App
 * Store link that would send people to the wrong place, `IOS_STATUS`
 * drives a "coming to iOS" state everywhere. Set `APP_STORE_URL` and
 * flip the status to "live" once the listing exists — no other change
 * is needed anywhere in the codebase.
 */
export const IOS_STATUS: "live" | "coming" = "coming";
export const APP_STORE_URL: string | null = null;
