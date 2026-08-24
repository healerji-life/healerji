import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/session";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";
import { createClient } from "@/lib/supabase/server";
import {
  buildExport, EXPORT_PERMISSION, SENSITIVE_DATASETS,
  type ExportDataset, type ExportFormat,
} from "@/lib/services/exports";

/**
 * Export endpoint.
 *
 * Three guarantees, in this order:
 *
 *   1. Permission. Each dataset declares the permission it needs, so an editor
 *      requesting `customers` is refused here — and RLS would return no rows
 *      even if this check were removed.
 *   2. Same filters as the screen. The query string is passed straight through
 *      to the same list service the table uses, so "export what I'm looking at"
 *      is literally that.
 *   3. Audit. Customer, payment and booking exports are recorded with the row
 *      count and filters, because someone taking a copy of the customer list is
 *      an event worth being able to reconstruct later.
 */
const DATASETS: ExportDataset[] = ["healers", "bookings", "payments", "customers", "articles"];
const FORMATS: ExportFormat[] = ["csv", "xlsx", "pdf"];

export async function GET(request: Request) {
  // Authenticate before looking at the query string at all. Validating first
  // told an anonymous caller which dataset names exist (400 for an unknown
  // one, 401 for a real one) — a small enumeration oracle with no upside.
  const session = await authorise();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(request.url);
  const dataset = url.searchParams.get("dataset") ?? "";
  const format = url.searchParams.get("format") ?? "csv";

  if (!DATASETS.includes(dataset as ExportDataset)) {
    return NextResponse.json({ error: "Unknown dataset." }, { status: 400 });
  }
  if (!FORMATS.includes(format as ExportFormat)) {
    return NextResponse.json({ error: "Unsupported format." }, { status: 400 });
  }

  const typed = dataset as ExportDataset;
  // Re-check with the permission this specific dataset requires, so an editor
  // asking for `customers` is still refused.
  const auth = await authorise(EXPORT_PERMISSION[typed]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== "dataset" && key !== "format") params[key] = value;
  });

  const result = await buildExport(typed, format as ExportFormat, params);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  if (SENSITIVE_DATASETS.includes(typed)) {
    await recordAudit({
      viewer: auth.viewer,
      action: AUDIT_ACTIONS.dataExported,
      resourceType: "export",
      resourceId: typed,
      summary: `Exported ${result.data.rowCount} ${typed} rows as ${format.toUpperCase()}`,
      after: { dataset: typed, format, rows: result.data.rowCount, filters: params },
    });

    const supabase = await createClient();
    if (supabase) {
      await supabase.from("export_jobs").insert({
        requested_by: auth.viewer.id,
        dataset: typed,
        format,
        filters: params as never,
        row_count: result.data.rowCount,
        status: "complete",
        completed_at: new Date().toISOString(),
      });
    }
  }

  const body =
    typeof result.data.body === "string"
      ? result.data.body
      : new Uint8Array(result.data.body);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": result.data.contentType,
      "Content-Disposition": `attachment; filename="${result.data.filename}"`,
      // An export is a point-in-time snapshot; never let a proxy serve a stale one.
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
