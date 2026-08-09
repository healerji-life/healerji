"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Languages, Star } from "lucide-react";
import { AvatarArt } from "@/components/ui/avatar-art";
import { CertifiedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { modalityBySlug } from "@/lib/data/modalities";
import { describeNextAvailable } from "@/lib/services/healer-adapter";
import { formatINR } from "@/lib/utils";
import type { Healer } from "@/types";

export function HealerCard({ healer }: { healer: Healer }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex h-full flex-col rounded-md bg-surface-0 p-6 shadow-e-1 transition-shadow duration-200 hover:shadow-e-2 dark:bg-night-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarArt name={healer.name} size={56} />
          <div>
            <h3 className="font-display text-lg leading-tight">
              <Link
                href={`/healers/${healer.slug}`}
                className="after:absolute after:inset-0 after:content-[''] relative outline-none"
              >
                {healer.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600 dark:text-mist-400">
              <Star className="h-3.5 w-3.5 fill-orchid-500 text-orchid-500" aria-hidden />
              {healer.rating.toFixed(1)}
              <span aria-hidden>·</span>
              <span>{healer.reviews} reviews</span>
            </p>
          </div>
        </div>
        {healer.verified.identity && (
          <CertifiedBadge
            detail={`Certified healer · ${healer.years} years of practice${healer.verified.interviewed ? " · interview-vetted by HealerJi" : ""}`}
          />
        )}
      </div>

      <p className="mt-4 text-ink-600 dark:text-mist-400">{healer.headline}</p>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Practices">
        {healer.modalities.map((m) => (
          <li
            key={m}
            className="rounded-full bg-plum-100 px-3 py-1 text-[13px] text-plum-900 dark:bg-night-950 dark:text-orchid-300"
          >
            {modalityBySlug(m)?.name ?? m}
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-600 dark:text-mist-400">
        <Languages className="h-4 w-4" aria-hidden />
        {healer.languages.join(" · ")}
      </p>

      <div className="mt-auto flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-mist-500">Per session, from</p>
          <p className="font-medium">{formatINR(healer.pricePaise)}</p>
        </div>
        <div className="relative z-10 text-right">
          {/* Null means the healer has published no availability. Saying so is
              better than implying a time that does not exist. */}
          <p className="mb-1.5 text-[13px] text-plum-700">
            {describeNextAvailable(healer.nextAvailableAt) ?? "Times to be announced"}
          </p>
          <Button size="sm" asChild>
            <Link href={`/book?healer=${healer.slug}`}>Book session</Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
