"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics/events";

/**
 * The public-site analytics tracker.
 *
 * Mounted once in the root layout. What it sends and, importantly, what it
 * deliberately does not:
 *
 *   Sends   event name, path, the route pattern, engagement time, scroll depth,
 *           referrer host, UTM parameters, screen width.
 *   Never   an IP, a cookie, a fingerprint, form contents, or any input value.
 *           The visitor id is derived server-side from a salted hash and is not
 *           readable here.
 *
 * CTA and outbound clicks are captured with ONE delegated listener on document
 * rather than by editing dozens of components. That keeps the design system
 * untouched — an explicit constraint — and means new buttons are tracked
 * automatically.
 *
 * Every send is fire-and-forget and fails silently: analytics must never be able
 * to break a booking.
 */

const SESSION_KEY = "healerji.analytics.session";
const SESSION_STARTED = "healerji.analytics.started";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Route patterns, so /healers/meera aggregates under /healers/[slug]. */
const ROUTE_PATTERNS: Array<[RegExp, string]> = [
  [/^\/healers\/[^/]+$/, "/healers/[slug]"],
  [/^\/library\/[^/]+$/, "/library/[slug]"],
  [/^\/blog\/[^/]+$/, "/blog/[slug]"],
  [/^\/chakras\/[^/]+$/, "/chakras/[slug]"],
  [/^\/healing\/[^/]+$/, "/healing/[slug]"],
  [/^\/paths\/[^/]+$/, "/paths/[slug]"],
  [/^\/practices\/[^/]+$/, "/practices/[slug]"],
  [/^\/legal\/[^/]+$/, "/legal/[slug]"],
];

function toRoute(pathname: string): string {
  for (const [pattern, route] of ROUTE_PATTERNS) {
    if (pattern.test(pathname)) return route;
  }
  return pathname;
}

interface SendPayload {
  name: AnalyticsEventName;
  path: string;
  route: string;
  properties?: Record<string, string | number | boolean | null>;
  title?: string;
  engagementMs?: number;
  maxScrollPct?: number;
  referrer?: string;
  utm?: Record<string, string | undefined>;
  screenWidth?: number;
}

function readSessionId(): string | undefined {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeSessionId(id: string): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    /* private mode — the server still records the event, just unsessioned */
  }
}

async function send(payload: SendPayload, useBeacon = false): Promise<void> {
  const body = JSON.stringify({ ...payload, sessionId: readSessionId() });

  try {
    if (useBeacon && typeof navigator.sendBeacon === "function") {
      // sendBeacon survives unload, which is the only way page_exit and its
      // engagement figures reliably arrive.
      navigator.sendBeacon("/api/analytics/collect", new Blob([body], { type: "application/json" }));
      return;
    }

    const response = await fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });

    // The server allocates the session id; store it so later events join up.
    const json = (await response.json().catch(() => null)) as { sessionId?: string } | null;
    if (json?.sessionId && !readSessionId()) writeSessionId(json.sessionId);
  } catch {
    /* never surfaced to the visitor */
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Engagement counts only while the tab is visible, so a page left open in a
  // background tab does not report hours of "engagement".
  const visibleSince = useRef<number | null>(null);
  const engagementMs = useRef(0);
  const maxScroll = useRef(0);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const path = pathname + (query ? `?${query}` : "");
    const route = toRoute(pathname);

    // Flush the previous page before recording the new one.
    if (lastPath.current && lastPath.current !== path) {
      const previous = lastPath.current;
      if (visibleSince.current !== null) {
        engagementMs.current += Date.now() - visibleSince.current;
        visibleSince.current = null;
      }
      void send({
        name: ANALYTICS_EVENTS.page_exit,
        path: previous,
        route: toRoute(previous.split("?")[0] ?? previous),
        engagementMs: Math.min(engagementMs.current, DAY_MS),
        maxScrollPct: maxScroll.current,
      });
    }

    lastPath.current = path;
    engagementMs.current = 0;
    maxScroll.current = 0;
    visibleSince.current = document.visibilityState === "visible" ? Date.now() : null;

    const utm = {
      source: searchParams.get("utm_source") ?? undefined,
      medium: searchParams.get("utm_medium") ?? undefined,
      campaign: searchParams.get("utm_campaign") ?? undefined,
      content: searchParams.get("utm_content") ?? undefined,
      term: searchParams.get("utm_term") ?? undefined,
    };

    let started = false;
    try {
      started = window.sessionStorage.getItem(SESSION_STARTED) === "1";
    } catch {
      /* ignore */
    }

    if (!started) {
      void send({
        name: ANALYTICS_EVENTS.session_start,
        path,
        route,
        referrer: document.referrer || undefined,
        utm,
        screenWidth: window.innerWidth,
      }).then(() => {
        try {
          window.sessionStorage.setItem(SESSION_STARTED, "1");
        } catch {
          /* ignore */
        }
      });
    }

    void send({
      name: ANALYTICS_EVENTS.page_view,
      path,
      route,
      title: document.title,
      referrer: document.referrer || undefined,
      utm,
      screenWidth: window.innerWidth,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        visibleSince.current = Date.now();
      } else if (visibleSince.current !== null) {
        engagementMs.current += Date.now() - visibleSince.current;
        visibleSince.current = null;
      }
    }

    let scrollFrame = 0;
    function onScroll() {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        const pct = scrollable <= 0 ? 100 : Math.round((window.scrollY / scrollable) * 100);
        const clamped = Math.max(0, Math.min(100, pct));
        if (clamped > maxScroll.current) {
          const previous = maxScroll.current;
          maxScroll.current = clamped;
          // Milestones only — an event per pixel would be useless and loud.
          for (const milestone of [25, 50, 75, 100]) {
            if (previous < milestone && clamped >= milestone && lastPath.current) {
              void send({
                name: ANALYTICS_EVENTS.scroll_depth,
                path: lastPath.current,
                route: toRoute(lastPath.current.split("?")[0] ?? lastPath.current),
                properties: { depth: milestone },
              });
            }
          }
        }
      });
    }

    function onPageHide() {
      if (!lastPath.current) return;
      if (visibleSince.current !== null) {
        engagementMs.current += Date.now() - visibleSince.current;
        visibleSince.current = null;
      }
      void send(
        {
          name: ANALYTICS_EVENTS.page_exit,
          path: lastPath.current,
          route: toRoute(lastPath.current.split("?")[0] ?? lastPath.current),
          engagementMs: Math.min(engagementMs.current, DAY_MS),
          maxScrollPct: maxScroll.current,
        },
        true
      );
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    // pagehide is more reliable than beforeunload on mobile Safari.
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;

      const path = lastPath.current ?? window.location.pathname;
      const route = toRoute(path.split("?")[0] ?? path);

      // 1. Explicit opt-in: data-analytics-event="practice_start"
      const tagged = target.closest<HTMLElement>("[data-analytics-event]");
      if (tagged) {
        const name = tagged.dataset.analyticsEvent as AnalyticsEventName | undefined;
        if (name) {
          void send({
            name,
            path,
            route,
            properties: {
              label: tagged.dataset.analyticsLabel ?? tagged.textContent?.trim().slice(0, 80) ?? "",
            },
          });
          return;
        }
      }

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";

      // 2. Booking intent — the funnel step that matters most commercially.
      if (href.startsWith("/book")) {
        void send({
          name: ANALYTICS_EVENTS.book_session_click,
          path,
          route,
          properties: { href: href.slice(0, 200), label: link.textContent?.trim().slice(0, 80) ?? "" },
        });
        return;
      }

      // 3. Outbound.
      if (/^https?:\/\//i.test(href) && !href.includes(window.location.host)) {
        let host = "";
        try {
          host = new URL(href).host;
        } catch {
          /* ignore */
        }
        void send({ name: ANALYTICS_EVENTS.outbound_click, path, route, properties: { host } });
        return;
      }

      // 4. Anything styled as a primary action counts as a CTA.
      if (link.closest("[data-cta]") || /\brounded-full\b/.test(link.className)) {
        void send({
          name: ANALYTICS_EVENTS.cta_click,
          path,
          route,
          properties: { href: href.slice(0, 200), label: link.textContent?.trim().slice(0, 80) ?? "" },
        });
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

/**
 * Imperative tracking for flows that are not clicks — booking steps, practice
 * completion, assistant interactions. No-ops on the server.
 */
export function trackEvent(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  void send({
    name,
    path,
    route: toRoute(path),
    ...(properties ? { properties } : {}),
  });
}
