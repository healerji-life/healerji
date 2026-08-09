"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin navigation.
 *
 * Items carry the permission they require. The server has already filtered
 * this list before it reaches the browser — the `permission` field is kept so
 * the shape is self-documenting, not so the client can decide anything.
 */
import type { NavItem } from "./nav-config";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="px-3">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              {item.children?.length ? (
                <>
                  <p className="px-3 pb-1 pt-5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-mist-500">
                    {item.label}
                  </p>
                  <ul className="space-y-0.5">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <NavLink href={child.href} active={isActive(pathname, child.href)}>
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <NavLink href={item.href} active={active}>
                  {item.label}
                </NavLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavLink({
  href, active, children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center rounded-sm px-3 text-[0.875rem] transition-colors duration-150",
        active
          ? "bg-orchid-500/[0.09] font-medium text-plum-900 dark:bg-orchid-500/15 dark:text-orchid-200"
          : "text-ink-600 hover:bg-ink-900/[0.035] dark:text-mist-400 dark:hover:bg-surface-0/[0.05]"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-orchid-500"
        />
      ) : null}
      {children}
    </Link>
  );
}

/** Mobile drawer. Admin is desktop-first, but must not be unusable on a phone. */
export function AdminMobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium hairline"
      >
        <span aria-hidden className="grid gap-[3px]">
          <span className="block h-[1.5px] w-4 bg-current" />
          <span className="block h-[1.5px] w-4 bg-current" />
          <span className="block h-[1.5px] w-4 bg-current" />
        </span>
        Menu
      </button>

      {open ? (
        <div
          id="admin-mobile-nav"
          className="mt-3 rounded-lg bg-white py-3 shadow-e-2 dark:bg-night-900"
          onClick={() => setOpen(false)}
        >
          <AdminNav items={items} />
        </div>
      ) : null}
    </div>
  );
}
