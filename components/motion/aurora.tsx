import { cn } from "@/lib/utils";

/**
 * HealerJi Aurora — three slow-drifting fields of brand light behind a
 * section, like dawn through incense smoke. Pure CSS keyframes on
 * transform/opacity (GPU-composited); stills completely under
 * prefers-reduced-motion. Tint defaults to the plum/orchid dusk; pass a
 * chakra colour to let a section lean toward its centre.
 */
export function Aurora({
  className,
  tint,
  intensity = 1,
}: {
  className?: string;
  /** optional hex colour (e.g. a chakra's) blended into the field */
  tint?: string;
  /** 0.5 = whisper, 1 = default, 1.5 = dark-section strength */
  intensity?: number;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div
        className="absolute -left-[10%] top-[-20%] h-[60vmax] w-[60vmax] rounded-full blur-[120px] animate-aurora-a"
        style={{ backgroundColor: tint ?? "#BE3A95", opacity: 0.1 * intensity }}
      />
      <div
        className="absolute right-[-15%] top-[10%] h-[50vmax] w-[50vmax] rounded-full blur-[120px] animate-aurora-b"
        style={{ backgroundColor: "#4B0E42", opacity: 0.12 * intensity }}
      />
      <div
        className="absolute bottom-[-25%] left-[20%] h-[55vmax] w-[55vmax] rounded-full blur-[130px] animate-aurora-c"
        style={{ backgroundColor: tint ?? "#BE3A95", opacity: 0.07 * intensity }}
      />
    </div>
  );
}
