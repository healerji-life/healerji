"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Healer portal navigation.
 *
 * A bottom bar on phones and a top row on wider screens. Bottom placement is
 * deliberate: a healer is most often here one-handed between sessions, and
 * thumb reach matters more than convention.
 */
const ITEMS = [
  { href: "/healer/dashboard", label: "Today" },
  { href: "/healer/availability", label: "Availability" },
  { href: "/healer/sessions", label: "Sessions" },
  { href: "/healer/profile", label: "Profile" },
  { href: "/healer/settings", label: "Settings" },
];

export function HealerPortalNav() {
  const pathname = usePathname();

  return (
    <>
      {/* wide screens */}
      <nav aria-label="Healer portal" className="hidden sm:block">
        <ul className="flex gap-1 border-b border-mist-200/70 dark:border-night-800">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative block px-4 py-3 text-sm transition-colors",
                    active
                      ? "font-medium text-plum-900 dark:text-orchid-200"
                      : "text-ink-600 hover:text-ink-900 dark:text-mist-400 dark:hover:text-surface-0"
                  )}
                >
                  {item.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-orchid-500 to-plum-900"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* phones */}
      <nav
        aria-label="Healer portal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-mist-200/70 bg-surface-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-night-800 dark:bg-night-950/95"
      >
        <ul className="flex">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 text-[0.6875rem]",
                    active ? "font-medium text-plum-900 dark:text-orchid-200" : "text-mist-500"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1 w-1 rounded-full",
                      active ? "bg-orchid-500" : "bg-transparent"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
