import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalLogin } from "@/components/auth/portal-login";
import { signIn } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/session";

export const metadata = { title: "Sign in · HealerJi for healers" };

export default async function HealerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;

  const viewer = await getViewer();
  if (viewer?.roles.includes("healer") && viewer.healerId) {
    redirect(params.next?.startsWith("/healer") ? params.next : "/healer/dashboard");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "https";

  return (
    <main id="main" className="flex min-h-svh items-center bg-surface-0 px-6 dark:bg-night-950">
      <PortalLogin
        action={signIn}
        title="Healer portal"
        subtitle="Set your availability and see the sessions you're holding."
        next={params.next?.startsWith("/healer") ? params.next : "/healer/dashboard"}
        {...(params.reason ? { reason: params.reason } : {})}
        origin={host ? `${proto}://${host}` : ""}
      />
    </main>
  );
}
