import { redirect } from "next/navigation";
import { PortalLogin } from "@/components/auth/portal-login";
import { signIn } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/session";
import { isSafeRedirect } from "@/lib/auth/redirects";

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


  return (
    <main id="main" className="flex min-h-svh items-center bg-surface-0 px-6 dark:bg-night-950">
      <PortalLogin
        action={signIn}
        title="Healer portal"
        subtitle="Set your availability and see the sessions you're holding."
        next={isSafeRedirect(params.next ?? "") && params.next!.startsWith("/healer") ? params.next! : "/healer/dashboard"}
        {...(params.reason ? { reason: params.reason } : {})}
      />
    </main>
  );
}
