import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  /** Anchor target, for in-page links such as the chakra page's skip link. */
  id?: string;
}) {
  return (
    <div id={id} className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}
