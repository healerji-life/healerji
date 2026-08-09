import Image from "next/image";
import { founder } from "@/lib/data/founder";
import { cn } from "@/lib/utils";

/**
 * The founder's voice, in the margin.
 *
 * Dr. Khetan isn't confined to an About page — her thinking appears
 * where it's relevant, set as marginalia: a small portrait, a line in
 * her voice, a hairline rule. Quiet enough to reassure without taking
 * over the page. This device recurs across the site, so her presence
 * becomes structural rather than a one-time introduction.
 */
export function FounderNote({
  children,
  className,
  attribution = true,
}: {
  children: React.ReactNode;
  className?: string;
  attribution?: boolean;
}) {
  return (
    <aside className={cn("relative py-2 pl-6", className)}>
      <span aria-hidden className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-ink-900/12 dark:bg-surface-0/15" />
      <p className="measure font-display text-lg leading-relaxed text-ink-900 dark:text-surface-0">
        {children}
      </p>
      {attribution && (
        <div className="mt-4 flex items-center gap-2.5">
          <Image
            src={founder.square}
            alt=""
            width={56}
            height={56}
            className="h-7 w-7 rounded-full object-cover"
          />
          <p className="text-[0.8125rem] text-mist-500">
            {founder.honorific} {founder.name} · {founder.role}
          </p>
        </div>
      )}
    </aside>
  );
}
