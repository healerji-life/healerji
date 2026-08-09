import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  parseImport, errorReportCsv, IMPORT_PERMISSION, type ImportTarget,
} from "@/lib/services/imports";

/**
 * Upload, parse and validate. Writes to staging only.
 *
 * A multipart route rather than a server action because a server action's body
 * limit is small and a 2,000-row workbook exceeds it comfortably.
 *
 * Nothing here touches a production table — that requires the separate Confirm
 * action, which refuses while any row is invalid.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const TARGETS: ImportTarget[] = ["healers", "articles"];

export async function POST(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("target") ?? "";
  if (!TARGETS.includes(target as ImportTarget)) {
    return NextResponse.json({ error: "Unknown import target." }, { status: 400 });
  }
  const typed = target as ImportTarget;

  const auth = await authorise(IMPORT_PERMISSION[typed]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose a file." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.` },
      { status: 413 }
    );
  }

  // Reference data, so unknown modalities / languages / categories are caught at
  // preview rather than as an unreadable foreign-key error on insert.
  const supabase = await createClient();
  const [modalities, languages, categories] = supabase
    ? await Promise.all([
        supabase.from("modalities").select("slug"),
        supabase.from("languages").select("code, name"),
        supabase.from("article_categories").select("slug"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const buffer = Buffer.from(await file.arrayBuffer());

  const report = await parseImport({
    target: typed,
    filename: file.name,
    buffer,
    uploadedBy: auth.viewer.id,
    knownModalities: (modalities.data ?? []).map((m) => (m as { slug: string }).slug),
    knownLanguages: (languages.data ?? []) as Array<{ code: string; name: string }>,
    knownCategories: (categories.data ?? []).map((c) => (c as { slug: string }).slug),
  });

  if (!report.ok) {
    return NextResponse.json({ error: report.error.message, detail: report.error.detail }, { status: 400 });
  }

  // Error report inline, so "Download errors" needs no second round trip.
  const errorCsv = report.data.errorCount > 0 ? errorReportCsv(report.data) : null;

  return NextResponse.json(
    {
      ok: true,
      batchId: report.data.batchId,
      filename: report.data.filename,
      headers: report.data.headers,
      unknownColumns: report.data.unknownColumns,
      missingColumns: report.data.missingColumns,
      validCount: report.data.validCount,
      errorCount: report.data.errorCount,
      // Cap the preview payload; the full set is staged in the database.
      rows: report.data.rows.slice(0, 200),
      totalRows: report.data.rows.length,
      errorCsv,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
