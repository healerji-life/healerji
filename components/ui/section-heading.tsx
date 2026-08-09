import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  align = "left",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-16 md:mb-24 max-w-[46ch]",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
          {eyebrow}
        </p>
      )}
      <h2 id={id} className="text-3xl md:text-4xl">{title}</h2>
      {lede && (
        <p
          className={cn(
            "measure mt-5 text-lg text-ink-600 dark:text-mist-400",
            align === "center" && "mx-auto"
          )}
        >
          {lede}
        </p>
      )}
    </header>
  );
}
