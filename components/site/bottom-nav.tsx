"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Compass, Home, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/healers", label: "Explore", icon: Compass },
  { href: "/book", label: "Book", icon: CalendarHeart, raised: true },
  { href: "/healy", label: "Healy", icon: Sparkles },
  { href: "/bookings", label: "You", icon: User },
];

/** App-grade bottom navigation for mobile — thumb-zone first. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobile"
      className="glass fixed inset-x-0 bottom-0 z-50 border-t border-surface-200/60 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex items-end justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon, raised }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-[56px] flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px]",
                  active ? "text-plum-900 dark:text-orchid-300" : "text-ink-600 dark:text-mist-400"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all",
                    raised
                      ? "-mt-6 h-12 w-12 bg-plum-800 text-surface-0 shadow-e-2"
                      : "h-7 w-7"
                  )}
                >
                  <Icon className={raised ? "h-5 w-5" : "h-[22px] w-[22px]"} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
