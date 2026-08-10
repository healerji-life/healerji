import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/lib/services/availability";
import { isDuration } from "@/lib/booking/window";

/**
 * Public availability lookup for the booking calendar.
 *
 * The calendar is a client component, so it cannot call the service directly
 * (that would pull `next/headers` into the browser bundle). This is the seam.
 *
 * It returns every published time for the day, each flagged open or not, so
 * the calendar can show a taken slot as unavailable rather than omitting it.
 * It still does not report *why* a slot is unavailable: booked, blocked and
 * past are collapsed in the service before they reach here, because the
 * distinction is a healer's private calendar and their booking volume.
 */
const querySchema = z.object({
  healer: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  minutes: z.coerce.number(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    healer: url.searchParams.get("healer") ?? "",
    date: url.searchParams.get("date") ?? "",
    minutes: url.searchParams.get("minutes") ?? 45,
  });

  if (!parsed.success || !isDuration(parsed.data.minutes)) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const result = await getAvailability(parsed.data.healer, parsed.data.date, parsed.data.minutes);

  // The service returns Result<DayAvailability>. Unwrapping it here — rather
  // than casting it away — is what resolves the mismatch the handoff flagged.
  if (!result.ok) {
    const status = result.error.code === "not_configured" ? 503 : 500;
    return NextResponse.json({ ok: false, error: result.error.message }, { status });
  }

  return NextResponse.json(
    { ok: true, data: result.data },
    { headers: { "Cache-Control": "no-store" } }
  );
}
