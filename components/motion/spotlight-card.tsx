"use client";

import RBSpotlightCard from "@/components/react-bits/SpotlightCard/SpotlightCard";
import { cn } from "@/lib/utils";

/**
 * HealerJi's SpotlightCard — the React Bits primitive with our light.
 *
 * The library's default is a bright white glow on a dark card; here
 * the pool is plum at low opacity and the surface comes from our own
 * tokens, so an interactive card still reads as HealerJi rather than
 * as a component demo.
 */
export function SpotlightCard({
  children,
  className,
  color = "75, 14, 66",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** "r, g, b" of the spotlight tint */
  color?: string;
  as?: "div" | "article" | "li";
}) {
  const inner = (
    <RBSpotlightCard className={cn(className)} spotlightColor={`rgba(${color}, 0.10)`}>
      {children}
    </RBSpotlightCard>
  );

  if (Tag === "li") return <li className="contents">{inner}</li>;
  if (Tag === "article") return <article className="contents">{inner}</article>;
  return inner;
}
