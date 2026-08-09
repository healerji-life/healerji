import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The loading indicator: the official lotus, breathing on the shared
 * 10s cycle. No spinners exist anywhere on this platform.
 */
export function BreathingMark({
  size = 28,
  className,
  label,
  onDark = false,
}: {
  size?: number;
  className?: string;
  label?: string;
  onDark?: boolean;
}) {
  const height = Math.round((size * 603) / 960);
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height }}
      role={label ? "status" : undefined}
      aria-label={label}
    >
      <span
        aria-hidden
        className="absolute -inset-[30%] rounded-full blur-xl animate-breathe-slow"
        style={{ backgroundColor: onDark ? "rgba(190,58,149,0.30)" : "rgba(75,14,66,0.12)" }}
      />
      <Image
        src={onDark ? "/brand/mark-light.svg" : "/brand/mark.svg"}
        alt=""
        width={size}
        height={height}
        className="relative animate-breathe"
        style={{ width: size, height }}
      />
    </span>
  );
}
