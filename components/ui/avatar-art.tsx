import { avatarGradient, initials, cn } from "@/lib/utils";

/**
 * Generative avatar: a calm gradient keyed to the person's name.
 * We never fake faces — until a healer's real portrait is uploaded,
 * their presence is typographic and honest.
 */
export function AvatarArt({
  name,
  size = 56,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const [a, b] = avatarGradient(name);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display text-surface-0",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
