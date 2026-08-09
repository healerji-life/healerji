"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BreathingMark } from "@/components/breathing-mark";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70svh] items-center pb-40 pt-44">
      <Container className="max-w-md text-center">
        <div className="mx-auto w-fit"><BreathingMark size={36} /></div>
        <h1 className="mt-6 font-display text-3xl">A stumble, not a fall.</h1>
        <p className="mt-3 text-ink-600 dark:text-mist-400">
          Something went wrong on our side — not yours. Take a breath; then let's try again.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" asChild><a href="/">Go home</a></Button>
        </div>
      </Container>
    </div>
  );
}
