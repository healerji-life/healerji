import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/services/tabular-read";
import { toCsv, type Column } from "@/lib/services/spreadsheet";
import { err, fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";
import { slugify } from "@/lib/format";
import type { Permission } from "@/lib/auth/roles";

/**
 * Bulk import.
 *
 * The rule that shapes everything here: nothing reaches a production table
 * until a human has seen a preview and pressed Confirm. Uploading parses and
 * validates into `import_batches` / `import_rows` (staging tables that already
 * exist from migration 0007) and returns a report. A separate, explicit action
 * commits.
 *
 * Invalid rows are never silently skipped — they are reported with a row number
 * and a reason, and the commit refuses to run while any remain.
 */

export type ImportTarget = "healers" | "articles";

export interface FieldSpec {
  /** Column heading, lower-cased. */
  column: string;
  required: boolean;
  hint: string;
}

export interface ImportIssue {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  normalised: Record<string, unknown> | null;
  errors: ImportIssue[];
}

export interface ImportReport {
  batchId: string | null;
  target: ImportTarget;
  filename: string;
  headers: string[];
  unknownColumns: string[];
  missingColumns: string[];
  rows: ParsedRow[];
  validCount: number;
  errorCount: number;
}

export const IMPORT_PERMISSION: Record<ImportTarget, Permission> = {
  healers: "healers.import",
  articles: "content.blog.import",
};

export const IMPORT_FIELDS: Record<ImportTarget, FieldSpec[]> = {
  healers: [
    { column: "name", required: true, hint: "Full name, 2–80 characters" },
    { column: "email", required: false, hint: "Used to invite them later; must be a valid address" },
    { column: "slug", required: false, hint: "lowercase-with-hyphens; generated from the name if blank" },
    { column: "headline", required: false, hint: "One line for the card, max 160 characters" },
    { column: "bio", required: false, hint: "First person, max 4000 characters" },
    { column: "years", required: false, hint: "Whole number, 0–80" },
    { column: "price", required: false, hint: "Rupees for a 45-minute session, e.g. 499" },
    { column: "languages", required: false, hint: "Semicolon or comma separated, e.g. English; Hindi" },
    { column: "modalities", required: false, hint: "Modality slugs, e.g. reiki-pranic-healing; life-coach" },
    { column: "session_types", required: false, hint: "Any of chat; audio; video" },
    { column: "status", required: false, hint: "draft, active or inactive — defaults to draft" },
  ],
  articles: [
    { column: "title", required: true, hint: "3–200 characters" },
    { column: "slug", required: false, hint: "lowercase-with-hyphens; generated from the title if blank" },
    { column: "excerpt", required: false, hint: "Standfirst, max 400 characters" },
    { column: "content", required: true, hint: "Markdown body" },
    { column: "author", required: false, hint: "Defaults to The HealerJi Journal" },
    { column: "category", required: false, hint: "Existing category slug" },
    { column: "tags", required: false, hint: "Semicolon or comma separated" },
    { column: "seo_title", required: false, hint: "Max 70 characters" },
    { column: "seo_description", required: false, hint: "Max 180 characters" },
    { column: "og_image", required: false, hint: "Absolute URL" },
    { column: "status", required: false, hint: "draft, published or archived — defaults to draft" },
    { column: "publish_date", required: false, hint: "YYYY-MM-DD; required when status is published" },
  ],
};

const splitList = (value: string): string[] =>
  value.split(/[;,]/).map((part) => part.trim()).filter(Boolean);

/**
 * Parses and validates an upload. Writes to staging only.
 *
 * `knownModalities` and `knownLanguages` are passed in so a healer row citing a
 * modality that does not exist is rejected at preview rather than failing on
 * insert with a foreign-key error nobody can read.
 */
export async function parseImport(params: {
  target: ImportTarget;
  filename: string;
  buffer: Buffer;
  uploadedBy: string;
  knownModalities?: string[];
  knownLanguages?: Array<{ code: string; name: string }>;
  knownCategories?: string[];
}): Promise<Result<ImportReport>> {
  const spec = IMPORT_FIELDS[params.target];

  let sheet;
  try {
    sheet = parseSpreadsheet(params.filename, params.buffer);
  } catch (caught) {
    return err(
      "validation",
      "We couldn't read that file. Please upload a CSV or an .xlsx workbook.",
      caught instanceof Error ? caught.message : undefined
    );
  }

  if (sheet.headers.length === 0) return err("validation", "That file has no header row.");
  if (sheet.rows.length === 0) return err("validation", "That file has a header row but no data.");
  if (sheet.rows.length > 2000) {
    return err("validation", "Please split files larger than 2,000 rows.");
  }

  const known = new Set(spec.map((f) => f.column));
  const unknownColumns = sheet.headers.filter((h) => h !== "" && !known.has(h));
  const missingColumns = spec.filter((f) => f.required && !sheet.headers.includes(f.column)).map((f) => f.column);

  const index = (column: string) => sheet.headers.indexOf(column);
  const cell = (row: string[], column: string): string => {
    const at = index(column);
    return at === -1 ? "" : (row[at] ?? "").trim();
  };

  const rows: ParsedRow[] = [];
  const seenSlugs = new Set<string>();

  sheet.rows.forEach((row, i) => {
    // +2: one for the header, one because humans count from 1.
    const rowNumber = i + 2;
    const raw: Record<string, string> = {};
    for (const field of spec) raw[field.column] = cell(row, field.column);

    const errors: ImportIssue[] = [];
    const add = (field: string, message: string) => errors.push({ rowNumber, field, message });

    let normalised: Record<string, unknown> | null = null;

    if (params.target === "healers") {
      normalised = normaliseHealer(raw, {
        add,
        seenSlugs,
        knownModalities: params.knownModalities ?? [],
        knownLanguages: params.knownLanguages ?? [],
      });
    } else {
      normalised = normaliseArticle(raw, {
        add,
        seenSlugs,
        knownCategories: params.knownCategories ?? [],
      });
    }

    rows.push({ rowNumber, raw, normalised: errors.length === 0 ? normalised : null, errors });
  });

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.length - validCount;

  // Stage it, so Confirm operates on exactly what was previewed rather than a
  // re-parse that could differ.
  const supabase = await createClient();
  let batchId: string | null = null;

  if (supabase && missingColumns.length === 0) {
    const { data: batch } = await supabase
      .from("import_batches")
      .insert({
        target: params.target,
        filename: params.filename,
        row_count: rows.length,
        valid_count: validCount,
        error_count: errorCount,
        status: "previewed",
        uploaded_by: params.uploadedBy,
      })
      .select("id")
      .single();

    batchId = batch?.id ?? null;

    if (batchId) {
      // Chunked, because a 2,000-row single insert can exceed request limits.
      const payload = rows.map((r) => ({
        batch_id: batchId as string,
        row_number: r.rowNumber,
        raw: r.raw as never,
        normalised: (r.normalised ?? null) as never,
        errors: r.errors as never,
        valid: r.errors.length === 0,
      }));
      for (let i = 0; i < payload.length; i += 500) {
        await supabase.from("import_rows").insert(payload.slice(i, i + 500));
      }
    }
  }

  return ok({
    batchId,
    target: params.target,
    filename: params.filename,
    headers: sheet.headers,
    unknownColumns,
    missingColumns,
    rows,
    validCount,
    errorCount,
  });
}

interface HealerContext {
  add: (field: string, message: string) => void;
  seenSlugs: Set<string>;
  knownModalities: string[];
  knownLanguages: Array<{ code: string; name: string }>;
}

function normaliseHealer(raw: Record<string, string>, ctx: HealerContext): Record<string, unknown> {
  const name = raw.name ?? "";
  if (name.length < 2) ctx.add("name", "Missing name");
  if (name.length > 80) ctx.add("name", "Name is longer than 80 characters");

  const slug = raw.slug ? slugify(raw.slug) : slugify(name);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) ctx.add("slug", "Invalid slug");
  if (ctx.seenSlugs.has(slug)) ctx.add("slug", `Duplicate slug "${slug}" in this file`);
  ctx.seenSlugs.add(slug);

  const email = raw.email ?? "";
  if (email !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) ctx.add("email", "Invalid email");

  const years = raw.years === "" ? 0 : Number(raw.years);
  if (!Number.isFinite(years) || years < 0 || years > 80) ctx.add("years", "Years must be a whole number 0–80");

  const price = raw.price === "" ? 0 : Number(String(raw.price).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(price) || price < 0) ctx.add("price", "Price must be a number in rupees");

  const languageNames = splitList(raw.languages ?? "");
  const languageCodes: string[] = [];
  for (const label of languageNames) {
    const match = ctx.knownLanguages.find(
      (l) => l.name.toLowerCase() === label.toLowerCase() || l.code.toLowerCase() === label.toLowerCase()
    );
    if (!match) ctx.add("languages", `Unknown language "${label}"`);
    else languageCodes.push(match.code);
  }

  const modalities = splitList(raw.modalities ?? "").map((m) => slugify(m));
  for (const modality of modalities) {
    if (!ctx.knownModalities.includes(modality)) {
      ctx.add("modalities", `Unknown modality "${modality}"`);
    }
  }

  const sessionTypes = splitList(raw.session_types ?? "").map((s) => s.toLowerCase());
  for (const kind of sessionTypes) {
    if (!["chat", "audio", "video"].includes(kind)) {
      ctx.add("session_types", `"${kind}" is not chat, audio or video`);
    }
  }

  const status = (raw.status ?? "").toLowerCase() || "draft";
  if (!["draft", "active", "inactive"].includes(status)) {
    ctx.add("status", `Status must be draft, active or inactive`);
  }

  return {
    name,
    slug,
    email: email || null,
    headline: (raw.headline ?? "").slice(0, 160),
    bio: (raw.bio ?? "").slice(0, 4000),
    years: Number.isFinite(years) ? Math.round(years) : 0,
    price_paise: Number.isFinite(price) ? Math.round(price * 100) : 0,
    languages: languageCodes,
    modalities,
    session_types: sessionTypes.length > 0 ? sessionTypes : ["audio", "video"],
    status,
  };
}

interface ArticleContext {
  add: (field: string, message: string) => void;
  seenSlugs: Set<string>;
  knownCategories: string[];
}

function normaliseArticle(raw: Record<string, string>, ctx: ArticleContext): Record<string, unknown> {
  const title = raw.title ?? "";
  if (title.length < 3) ctx.add("title", "Missing title");

  const slug = raw.slug ? slugify(raw.slug) : slugify(title);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) ctx.add("slug", "Invalid slug");
  if (ctx.seenSlugs.has(slug)) ctx.add("slug", `Duplicate slug "${slug}" in this file`);
  ctx.seenSlugs.add(slug);

  const content = raw.content ?? "";
  if (content.trim().length < 20) ctx.add("content", "Content is empty or too short");

  const category = raw.category ? slugify(raw.category) : "";
  if (category !== "" && !ctx.knownCategories.includes(category)) {
    ctx.add("category", `Unknown category "${category}"`);
  }

  const status = (raw.status ?? "").toLowerCase() || "draft";
  if (!["draft", "published", "archived"].includes(status)) {
    ctx.add("status", "Status must be draft, published or archived");
  }

  let publishedAt: string | null = null;
  const dateRaw = raw.publish_date ?? "";
  if (dateRaw !== "") {
    const parsed = new Date(dateRaw);
    if (Number.isNaN(parsed.getTime())) ctx.add("publish_date", "Invalid date");
    else publishedAt = parsed.toISOString();
  } else if (status === "published") {
    publishedAt = new Date().toISOString();
  }

  const ogImage = raw.og_image ?? "";
  if (ogImage !== "" && !/^https?:\/\//i.test(ogImage)) {
    ctx.add("og_image", "Must be an absolute URL");
  }

  const words = content.trim().split(/\s+/).length;

  return {
    title,
    slug,
    excerpt: (raw.excerpt ?? "").slice(0, 400),
    body_markdown: content,
    author_name: raw.author || "The HealerJi Journal",
    category_slug: category || null,
    tags: splitList(raw.tags ?? "").slice(0, 20),
    seo_title: (raw.seo_title ?? "").slice(0, 70) || null,
    seo_description: (raw.seo_description ?? "").slice(0, 180) || null,
    og_image_url: ogImage || null,
    status,
    published_at: publishedAt,
    read_minutes: Math.max(1, Math.min(120, Math.round(words / 200))),
  };
}

// ------------------------------------------------------------------ commit ----

/**
 * Commits a previewed batch.
 *
 * Refuses while any row is invalid, so a partial import cannot happen by
 * accident. Healer child rows (languages, modalities, offerings, settings) are
 * written per healer after the parent insert.
 */
export async function commitImport(
  batchId: string,
  actorId: string
): Promise<Result<{ imported: number; failed: number; messages: string[] }>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data: batch, error: batchError } = await supabase
    .from("import_batches").select("*").eq("id", batchId).maybeSingle();
  if (batchError) return fromPostgrestError(batchError);
  if (!batch) return err("not_found", "That import could not be found.");
  if (batch.status === "committed") return err("conflict", "That import has already been applied.");
  if (batch.error_count > 0) {
    return err("validation", `${batch.error_count} row(s) still have errors. Fix the file and upload again.`);
  }

  const { data: rows, error: rowsError } = await supabase
    .from("import_rows").select("row_number, normalised").eq("batch_id", batchId).eq("valid", true)
    .order("row_number");
  if (rowsError) return fromPostgrestError(rowsError);

  let imported = 0;
  let failed = 0;
  const messages: string[] = [];

  for (const row of rows ?? []) {
    const value = row.normalised as Record<string, unknown> | null;
    if (!value) { failed++; continue; }

    if (batch.target === "healers") {
      const { data: healer, error } = await supabase
        .from("healers")
        .upsert(
          {
            slug: String(value.slug),
            name: String(value.name),
            headline: String(value.headline ?? ""),
            bio: String(value.bio ?? ""),
            years: Number(value.years ?? 0),
            price_paise: Number(value.price_paise ?? 0),
            status: String(value.status ?? "draft") as never,
            created_by: actorId,
            updated_by: actorId,
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (error || !healer) {
        failed++;
        messages.push(`Row ${row.row_number}: ${error?.message ?? "insert failed"}`);
        continue;
      }

      const languages = (value.languages as string[]) ?? [];
      const modalities = (value.modalities as string[]) ?? [];
      const sessionTypes = (value.session_types as string[]) ?? [];

      await supabase.from("healer_languages").delete().eq("healer_id", healer.id);
      if (languages.length > 0) {
        await supabase.from("healer_languages").insert(
          languages.map((code, i) => ({ healer_id: healer.id, language_code: code, display_order: i }))
        );
      }

      await supabase.from("healer_modalities").delete().eq("healer_id", healer.id);
      if (modalities.length > 0) {
        await supabase.from("healer_modalities").insert(
          modalities.map((slug, i) => ({ healer_id: healer.id, modality_slug: slug, display_order: i }))
        );
      }

      // Same pro-rata rule the rest of the platform uses: base rate is 45 min.
      const base = Number(value.price_paise ?? 0);
      const offerings = sessionTypes.flatMap((kind) =>
        [30, 45, 60].map((minutes) => ({
          healer_id: healer.id,
          kind: kind as never,
          duration_minutes: minutes,
          price_paise: Math.round((base * minutes) / 45),
          active: true,
        }))
      );
      if (offerings.length > 0) {
        await supabase.from("session_offerings").upsert(offerings, {
          onConflict: "healer_id,kind,duration_minutes",
        });
      }

      // Imported healers start closed: nobody has agreed a schedule yet.
      await supabase.from("healer_booking_settings").upsert(
        { healer_id: healer.id, accepting_bookings: false },
        { onConflict: "healer_id" }
      );

      imported++;
    } else {
      const { error } = await supabase.from("articles").upsert(
        {
          slug: String(value.slug),
          title: String(value.title),
          excerpt: String(value.excerpt ?? ""),
          body_markdown: String(value.body_markdown ?? ""),
          author_name: String(value.author_name ?? "The HealerJi Journal"),
          category_slug: (value.category_slug as string | null) ?? null,
          tags: (value.tags as string[]) ?? [],
          seo_title: (value.seo_title as string | null) ?? null,
          seo_description: (value.seo_description as string | null) ?? null,
          og_image_url: (value.og_image_url as string | null) ?? null,
          status: String(value.status ?? "draft") as never,
          published_at: (value.published_at as string | null) ?? null,
          read_minutes: Number(value.read_minutes ?? 5),
          created_by: actorId,
          updated_by: actorId,
        },
        { onConflict: "slug" }
      );

      if (error) {
        failed++;
        messages.push(`Row ${row.row_number}: ${error.message}`);
      } else {
        imported++;
      }
    }
  }

  await supabase
    .from("import_batches")
    .update({ status: failed > 0 ? "failed" : "committed", committed_at: new Date().toISOString() })
    .eq("id", batchId);

  return ok({ imported, failed, messages: messages.slice(0, 20) });
}

/** CSV of just the failing rows, so a large file can be corrected and re-uploaded. */
export function errorReportCsv(report: ImportReport): string {
  const failing = report.rows.filter((r) => r.errors.length > 0);
  const columns: Column<ParsedRow>[] = [
    { key: "row", header: "Row", value: (r) => r.rowNumber },
    { key: "problems", header: "Problems", value: (r) => r.errors.map((e) => `${e.field}: ${e.message}`).join(" | ") },
    ...IMPORT_FIELDS[report.target].map((field) => ({
      key: field.column,
      header: field.column,
      value: (r: ParsedRow) => r.raw[field.column] ?? "",
    })),
  ];
  return toCsv(failing, columns);
}
