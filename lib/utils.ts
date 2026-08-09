import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** Deterministic gradient pair from a name — used for generative avatars. */
export function avatarGradient(seed: string): [string, string] {
  const palette: [string, string][] = [
    ["#4B0E42", "#BE3A95"],
    ["#731765", "#D369B3"],
    ["#901D7F", "#E29CCD"],
    ["#4B1B3C", "#A63082"],
    ["#340E2E", "#862769"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}
