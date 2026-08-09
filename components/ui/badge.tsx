import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function CertifiedBadge({
  detail,
  className,
}: {
  detail?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-orchid-500/15 px-2.5 py-0.5 text-[13px] font-medium text-orchid-600",
        className
      )}
      title={detail ?? "Certified healer, vetted by HealerJi"}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      Certified
    </span>
  );
}
