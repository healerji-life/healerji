import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BreathingMark } from "@/components/breathing-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center px-5 text-center">
      <BreathingMark size={48} />
      <h1 className="mt-8 text-4xl">This path doesn't exist.</h1>
      <p className="mt-4 max-w-[40ch] text-ink-600 dark:text-mist-400">
        But yours does. Take a breath, then let's find where you meant to go.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/healers">Browse healers</Link>
        </Button>
      </div>
    </div>
  );
}
