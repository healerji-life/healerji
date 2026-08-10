import type { Permission } from "@/lib/auth/roles";

export interface NavItem {
  href: string;
  label: string;
  permission: Permission;
  children?: {
    href: string;
    label: string;
    permission: Permission;
  }[];
}

export const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Overview", permission: "analytics.view" },
  { href: "/admin/analytics", label: "Analytics", permission: "analytics.view" },
  { href: "/admin/bookings", label: "Bookings", permission: "bookings.view.all" },
  { href: "/admin/healers", label: "Healers", permission: "healers.view" },
  { href: "/admin/customers", label: "Customers", permission: "customers.view" },
  { href: "/admin/payments", label: "Payments", permission: "payments.view" },
  {
    href: "/admin/blog",
    label: "Content",
    permission: "content.blog.manage",
    children: [
      { href: "/admin/blog", label: "Blogs", permission: "content.blog.manage" },
      { href: "/admin/practices", label: "Guided Practices", permission: "content.practices.manage" },
      { href: "/admin/team", label: "Team", permission: "content.pages.manage" },
    ],
  },
  { href: "/admin/users", label: "Users", permission: "users.view" },
  { href: "/admin/audit", label: "Audit Log", permission: "audit.view" },
  { href: "/admin/settings", label: "Settings", permission: "settings.view" },
];
