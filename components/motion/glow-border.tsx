import { cn } from "@/lib/utils";

/**
 * HealerJi GlowBorder — a slow band of plum→orchid light circling a
 * featured surface (one per page at most: Healy's card, a premium CTA).
 * Conic-gradient rotation via CSS keyframes; settles to a static
 * gradient hairline under prefers-reduced-motion.
 */
export function GlowBorder({
  children,
  className,
  radius = "rounded-lg",
}: {
  children: React.ReactNode;
  className?: string;
  radius?: string;
}) {
  return (
    <div className={cn("relative p-[1.5px]", radius, className)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 animate-border-glow motion-reduce:animate-none",
          radius
        )}
        style={{
          background:
            "conic-gradient(from var(--glow-angle, 0deg), rgba(190,58,149,0.55), rgba(75,14,66,0.12) 30%, rgba(190,58,149,0.05) 55%, rgba(190,58,149,0.55) 100%)",
        }}
      />
      <div className={cn("relative", radius === "rounded-lg" ? "rounded-lg" : radius)}>{children}</div>
    </div>
  );
}
