import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { BottomNav } from "@/components/site/bottom-nav";
import { ScrollProgress } from "@/components/scroll-progress";

/**
 * The public website shell.
 *
 * This lives in a route group rather than in the root layout so that it applies
 * to the marketing and booking pages only. /admin and /healer are separate
 * applications with their own shells: before this existed they inherited the
 * public header, footer, bottom navigation and route-transition animation,
 * which put a customer-facing navbar on top of every operations screen.
 *
 * The group changes no URLs — /about is still /about.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollProgress />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}
