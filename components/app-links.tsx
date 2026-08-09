"use client";

import { APP_STORE_URL, GOOGLE_PLAY_URL, IOS_STATUS } from "@/lib/config/app";
import { cn } from "@/lib/utils";

/**
 * Store links, in one place.
 *
 * Both read from `lib/config/app.ts`, so a package id can never drift
 * between surfaces. Where the iOS listing isn't live, the control
 * states that plainly instead of linking somewhere wrong.
 */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden fill="currentColor">
      <path d="M3.6 1.8a1.5 1.5 0 0 0-.5 1.1v18.2a1.5 1.5 0 0 0 .5 1.1l.1.1L13.8 12v-.2L3.7 1.8h-.1Zm11.4 13.6L5.6 22.5l9.4-5.4 3.3-1.9-3.3-1.9Zm5.3-4.6-2.5-1.4-3.4 3.6 3.4 3.4 2.5-1.4c.8-.5.8-1.8 0-2.2ZM5.6 1.5l9.4 5.4 3.3-1.9L5.6 1.5Z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden fill="currentColor">
      <path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.2 1.2-2.5 1.2-2.5s-2.4-.9-2.4-3.6ZM14.2 5.6c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3Z" />
    </svg>
  );
}

const shell =
  "hairline flex h-12 items-center gap-3 rounded-full px-5 transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]";

export function AppLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className={shell}>
        <PlayGlyph />
        <span className="text-left leading-none">
          <span className="block text-[0.6875rem] uppercase tracking-[0.12em] text-mist-500">Get it on</span>
          <span className="mt-1 block text-[0.9375rem] font-medium">Google Play</span>
        </span>
      </a>

      {IOS_STATUS === "live" && APP_STORE_URL ? (
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={shell}>
          <AppleGlyph />
          <span className="text-left leading-none">
            <span className="block text-[0.6875rem] uppercase tracking-[0.12em] text-mist-500">Download on the</span>
            <span className="mt-1 block text-[0.9375rem] font-medium">App Store</span>
          </span>
        </a>
      ) : (
        <span className={cn(shell, "cursor-default opacity-70 hover:bg-transparent dark:hover:bg-transparent")}>
          <AppleGlyph />
          <span className="text-left leading-none">
            <span className="block text-[0.6875rem] uppercase tracking-[0.12em] text-mist-500">Arriving on</span>
            <span className="mt-1 block text-[0.9375rem] font-medium">iPhone</span>
          </span>
        </span>
      )}
    </div>
  );
}
