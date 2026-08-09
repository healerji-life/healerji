"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Globe, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLogo } from "@/components/site/nav-logo";
import { concerns } from "@/lib/config/taxonomy";
import { cn } from "@/lib/utils";
import { easeCalm } from "@/lib/motion";

const navLinks = [
  { href: "/healers", label: "Healers" },
  { href: "/chakras", label: "Chakras" },
  { href: "/healy", label: "Healy AI" },
  { href: "/library", label: "Library" },
  { href: "/community", label: "Community" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMegaOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-shadow duration-300",
        scrolled ? "glass shadow-e-1" : "bg-transparent"
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <NavLogo />

        {/* Desktop */}
        <div className="hidden min-w-0 items-center gap-0.5 lg:flex">
          <button
            className={cn(
              "flex h-9 items-center gap-1 rounded-full px-3 text-[0.9375rem] text-ink-600 transition-colors hover:text-ink-900 dark:text-mist-400 dark:hover:text-surface-0",
              megaOpen && "text-ink-900 dark:text-surface-0"
            )}
            aria-expanded={megaOpen}
            aria-controls="paths-menu"
            onClick={() => setMegaOpen((v) => !v)}
          >
            Paths
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", megaOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex h-9 items-center rounded-full px-3 text-[0.9375rem] text-ink-600 transition-colors hover:text-ink-900 dark:text-mist-400 dark:hover:text-surface-0",
                pathname.startsWith(l.href) && "text-ink-900 dark:text-surface-0"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Button variant="secondary" size="icon" className="hidden xl:inline-flex" aria-label="Search HealerJi">
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </Button>
          <Button variant="secondary" size="icon" className="hidden xl:inline-flex" aria-label="Switch language">
            <Globe className="h-[18px] w-[18px]" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
            aria-pressed={dark}
            onClick={() => setDark((v) => !v)}
          >
            {dark ? (
              <Sun className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <Moon className="h-[18px] w-[18px]" aria-hidden />
            )}
          </Button>
          <Button variant="tertiary" asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/healers">Find your healer</Link>
          </Button>
        </div>

        {/* Mobile trigger */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          {drawerOpen ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </nav>

      {/* Mega menu — Paths */}
      <AnimatePresence>
        {megaOpen && (
          <motion.div
            id="paths-menu"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: easeCalm }}
            className="glass hidden border-t border-surface-200/60 shadow-e-2 lg:block"
          >
            <div className="mx-auto grid max-w-6xl grid-cols-[1.4fr_1fr] gap-10 px-8 py-10">
              <ul className="grid grid-cols-1 gap-1">
                {concerns.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/paths/${p.slug}`}
                      className="group flex flex-col rounded-md px-4 py-3 transition-colors hover:bg-surface-100 dark:hover:bg-night-900"
                    >
                      <span className="font-display text-lg text-ink-900 group-hover:text-plum-900 dark:text-surface-0">
                        {p.name}
                        <span className="ml-2 text-sm text-mist-400">{p.nameHi}</span>
                      </span>
                      <span className="text-sm text-ink-600 dark:text-mist-400">
                        {p.line}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col justify-between rounded-md bg-plum-100/70 p-6 dark:bg-night-900">
                <div>
                  <p className="font-display text-lg">Not sure where to begin?</p>
                  <p className="mt-2 text-sm text-ink-600 dark:text-mist-400">
                    Tell Healy, HealerJi's AI assistant, what's on your mind — it
                    will point you to the right path and healers, privately.
                  </p>
                </div>
                <Button variant="secondary" className="mt-6 self-start" asChild>
                  <Link href="/healy">Talk to Healy</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass border-t border-surface-200/60 lg:hidden"
          >
            <div className="space-y-1 px-5 py-6">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-[0.14em] text-mist-500">
                Paths
              </p>
              {concerns.map((p) => (
                <Link
                  key={p.slug}
                  href={`/paths/${p.slug}`}
                  className="block rounded-md px-3 py-3 text-lg"
                >
                  {p.name}
                </Link>
              ))}
              <div className="my-3 h-px bg-surface-200" />
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-md px-3 py-3 text-lg">
                  {l.label}
                </Link>
              ))}
              <div className="flex gap-3 px-3 pt-4">
                <Button className="flex-1" asChild>
                  <Link href="/healers">Find your healer</Link>
                </Button>
                <Button variant="secondary" className="flex-1" asChild>
                  <Link href="/signin">Sign in</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
