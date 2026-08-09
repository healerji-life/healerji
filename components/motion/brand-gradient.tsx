import { cn } from "@/lib/utils";

/**
 * Brand gradient text — the one place colour is allowed to carry a
 * word, and it uses only the official palette: primary #BE3A95 into
 * secondary #4B0E42. Reserved for a single word in a hero or a
 * section opener; never navigation, never body copy.
 */
export function BrandGradient({
  children,
  className,
  direction = "105deg",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: string;
}) {
  return (
    <span
      className={cn("bg-clip-text text-transparent", className)}
      style={{ backgroundImage: `linear-gradient(${direction}, #BE3A95, #4B0E42)` }}
    >
      {children}
    </span>
  );
}
