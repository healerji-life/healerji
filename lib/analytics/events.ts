/**
 * The event registry.
 *
 * Requirement 12 lists what the website must track. Naming them here — rather
 * than as free strings at each call site — means the admin analytics screens
 * can enumerate every event that exists, and a typo becomes a compile error
 * instead of a silently missing metric.
 */

export const ANALYTICS_EVENTS = {
  // navigation
  session_start: "session_start",
  page_view: "page_view",
  page_exit: "page_exit",
  scroll_depth: "scroll_depth",
  outbound_click: "outbound_click",

  // engagement
  cta_click: "cta_click",
  search_query: "search_query",
  filter_applied: "filter_applied",

  // content
  healer_profile_view: "healer_profile_view",
  blog_view: "blog_view",
  chakra_view: "chakra_view",
  seed_sound_play: "seed_sound_play",
  practice_start: "practice_start",
  practice_complete: "practice_complete",

  // assistant
  assistant_open: "assistant_open",
  assistant_message: "assistant_message",

  // booking funnel
  book_session_click: "book_session_click",
  booking_start: "booking_start",
  booking_slot_selected: "booking_slot_selected",
  booking_details_submitted: "booking_details_submitted",
  booking_complete: "booking_complete",
  payment_success: "payment_success",
  payment_failure: "payment_failure",

  // app
  app_download_click: "app_download_click",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ALL_EVENT_NAMES = Object.values(ANALYTICS_EVENTS) as AnalyticsEventName[];

/** Human labels for the admin analytics UI. */
export const EVENT_LABEL: Record<AnalyticsEventName, string> = {
  session_start: "Session started",
  page_view: "Page view",
  page_exit: "Page exit",
  scroll_depth: "Scroll depth",
  outbound_click: "Outbound click",
  cta_click: "CTA click",
  search_query: "Search",
  filter_applied: "Filter applied",
  healer_profile_view: "Healer profile view",
  blog_view: "Blog view",
  chakra_view: "Chakra page view",
  seed_sound_play: "Seed sound play",
  practice_start: "Guided practice started",
  practice_complete: "Guided practice completed",
  assistant_open: "AI assistant opened",
  assistant_message: "AI assistant interaction",
  book_session_click: "Book session click",
  booking_start: "Booking started",
  booking_slot_selected: "Slot selected",
  booking_details_submitted: "Booking details submitted",
  booking_complete: "Booking completed",
  payment_success: "Payment succeeded",
  payment_failure: "Payment failed",
  app_download_click: "App download click",
};

export interface TrackPayload {
  name: AnalyticsEventName;
  path?: string;
  route?: string;
  properties?: Record<string, string | number | boolean | null>;
  healerId?: string;
  articleId?: string;
  bookingId?: string;
}

/**
 * Client-side dispatch. Deliberately fire-and-forget and deliberately silent
 * on failure: analytics must never break a booking.
 *
 * sendBeacon is used where available so an event fired during page unload
 * still arrives.
 */
export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ ...payload, path: payload.path ?? window.location.pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/collect", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never surfaced to the visitor */
  }
}
