import { redirect } from "next/navigation";
import { PortalLogin } from "@/components/auth/portal-login";
import { signIn } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";

export const metadata = { title: "Sign in · HealerJi Operations" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;

  // Already signed in as staff: don't make them type it again.
  const viewer = await getViewer();
  if (viewer && isStaff(viewer.roles)) {
    redirect(params.next?.startsWith("/admin") ? params.next : "/admin/dashboard");
  }


  return (
    <main id="main" className="flex min-h-svh items-center bg-surface-0 px-6 dark:bg-night-950">
      <PortalLogin
        action={signIn}
        title="Admin portal"
        subtitle="Sign in to manage healers, bookings, content and analytics."
        next={params.next?.startsWith("/admin") ? params.next : "/admin/dashboard"}
        {...(params.reason ? { reason: params.reason } : {})}
      />
    </main>
  );
}
