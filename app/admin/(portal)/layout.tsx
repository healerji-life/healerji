import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { can, ROLE_LABEL } from "@/lib/auth/roles";
import { signOut } from "@/lib/auth/actions";
import { AdminNav, AdminMobileNav } from "@/components/admin/nav";
import { NAV, type NavItem } from "@/components/admin/nav-config";

/**
 * The admin shell.
 *
 * A route group, so /admin/login sits outside it and does not inherit a layout
 * that requires being signed in.
 *
 * requireStaff() runs here on every request. Middleware has already redirected
 * the obvious cases, but middleware is not the boundary — it can be bypassed by
 * calling a route handler directly, and it does not protect the data itself.
 * This check, plus RLS underneath, is what actually holds.
 */
export const dynamic = "force-dynamic";

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();

  // Nav is filtered on the server: an editor never receives the markup for
  // Payments or Customers, so there is nothing to un-hide in devtools.
  const items: NavItem[] = NAV.filter((item) => can(viewer.roles, item.permission)).map((item) =>
    item.children
      ? { ...item, children: item.children.filter((c) => can(viewer.roles, c.permission)) }
      : item
  );

  return (
    <div className="min-h-svh bg-surface-0 text-ink-900 dark:bg-night-950 dark:text-surface-0">
      <div className="lg:grid lg:grid-cols-[248px_1fr]">
        {/* ---------------------------------------------------------- sidebar */}
        <aside className="hidden border-r border-mist-200/70 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col dark:border-night-800">
          <div className="px-6 pb-6 pt-7">
            <Link href="/admin/dashboard" className="block">
              <span className="font-display text-[1.0625rem] tracking-[-0.01em]">HealerJi</span>
              <span
                aria-hidden
                className="mt-2 block h-px w-full bg-gradient-to-r from-orchid-500/60 via-plum-900/20 to-transparent"
              />
              <span className="mt-2 block text-[0.6875rem] uppercase tracking-[0.16em] text-mist-500">
                Operations
              </span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
            <AdminNav items={items} />
          </div>

          <div className="border-t border-mist-200/70 p-4 dark:border-night-800">
            <p className="truncate text-sm font-medium">{viewer.fullName ?? viewer.email}</p>
            <p className="mt-0.5 truncate text-xs text-mist-500">
              {viewer.roles.map((r) => ROLE_LABEL[r]).join(", ") || "No role assigned"}
            </p>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="h-9 w-full rounded-full text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* ------------------------------------------------------------- main */}
        <div className="min-w-0">
          <div className="border-b border-mist-200/70 px-5 py-4 lg:hidden dark:border-night-800">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-base">HealerJi Operations</span>
              <form action={signOut}>
                <button type="submit" className="h-9 rounded-full px-4 text-sm hairline">
                  Sign out
                </button>
              </form>
            </div>
            <div className="mt-3">
              <AdminMobileNav items={items} />
            </div>
          </div>

          <main id="main" className="px-5 py-8 md:px-8 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
