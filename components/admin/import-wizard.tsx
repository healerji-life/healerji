"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { commitImportAction, type ImportCommitState } from "@/lib/actions/imports";
import { SubmitButton, FormMessage } from "@/components/admin/form";
import { Panel, Table, Th, Td, Badge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * Upload → parse → preview → validate → confirm → import.
 *
 * The Confirm button does not exist while any row has an error. That is
 * deliberate: a partial import leaves an operator unsure what landed, and
 * "skip the bad ones" is how duplicate healers and half-written articles get
 * into production.
 */

interface FieldSpec {
  column: string;
  required: boolean;
  hint: string;
}

interface PreviewRow {
  rowNumber: number;
  raw: Record<string, string>;
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

interface Report {
  batchId: string | null;
  filename: string;
  headers: string[];
  unknownColumns: string[];
  missingColumns: string[];
  validCount: number;
  errorCount: number;
  rows: PreviewRow[];
  totalRows: number;
  errorCsv: string | null;
}

export function ImportWizard({
  target, fields, templateName,
}: {
  target: "healers" | "articles";
  fields: FieldSpec[];
  templateName: string;
}) {
  const [state, formAction] = useActionState<ImportCommitState, FormData>(commitImportAction, {});
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setStatus("parsing");
    setMessage(null);
    setReport(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/import?target=${target}`, { method: "POST", body });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        setStatus("error");
        setMessage(json.error ?? "We couldn't read that file.");
        return;
      }
      setReport(json as Report);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("That upload failed. Please try again.");
    }
  }

  /** Client-side template download, so no extra route is needed. */
  function downloadTemplate() {
    const header = fields.map((f) => f.column).join(",");
    const example = fields.map((f) => (f.required ? "REQUIRED" : "")).join(",");
    const blob = new Blob([`﻿${header}\r\n${example}\r\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = templateName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadErrors() {
    if (!report?.errorCsv) return;
    const blob = new Blob([report.errorCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${target}-import-errors.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const committed = Boolean(state.notice);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------ 1. columns */}
      <Panel title="Expected columns" description="Order does not matter. Extra columns are ignored and reported.">
        <div className="px-6 py-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <li key={field.column} className="text-sm">
                <code className="rounded-sm bg-surface-50 px-1.5 py-0.5 text-xs dark:bg-night-950">
                  {field.column}
                </code>
                {field.required ? (
                  <span className="ml-2 text-xs font-medium text-orchid-500">required</span>
                ) : null}
                <span className="mt-0.5 block text-xs text-mist-500">{field.hint}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-5 h-10 rounded-full px-4 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
          >
            Download CSV template
          </button>
        </div>
      </Panel>

      {/* ------------------------------------------------------- 2. upload */}
      <Panel title="Upload" description="CSV or .xlsx, up to 5 MB and 2,000 rows.">
        <div className="px-6 py-5">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={status === "parsing"}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-11 items-center rounded-full bg-plum-900 px-5 text-sm font-medium text-surface-0 transition-colors hover:bg-plum-950 disabled:opacity-40"
            >
              {status === "parsing" ? "Reading…" : report ? "Choose a different file" : "Choose file"}
            </button>
            {report ? (
              <span className="text-sm text-mist-500">{report.filename}</span>
            ) : null}
          </div>

          {message ? (
            <p role="alert" className="mt-3 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
              {message}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-mist-500">
            Nothing is written until you press Confirm. Uploading only reads and
            checks the file.
          </p>
        </div>
      </Panel>

      {/* ------------------------------------------- 3. preview + validate */}
      {report ? (
        <>
          <Panel
            title="Preview"
            description={`${report.totalRows} row${report.totalRows === 1 ? "" : "s"} read from ${report.filename}`}
          >
            <div className="flex flex-wrap gap-3 px-6 py-5">
              <Badge tone={report.validCount > 0 ? "positive" : "neutral"}>
                {report.validCount} valid
              </Badge>
              <Badge tone={report.errorCount > 0 ? "critical" : "neutral"}>
                {report.errorCount} with errors
              </Badge>
              {report.unknownColumns.length > 0 ? (
                <Badge tone="warning">
                  ignored: {report.unknownColumns.join(", ")}
                </Badge>
              ) : null}
            </div>

            {report.missingColumns.length > 0 ? (
              <p role="alert" className="mx-6 mb-5 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
                Required column{report.missingColumns.length === 1 ? "" : "s"} missing:{" "}
                <strong>{report.missingColumns.join(", ")}</strong>. Add them and upload again.
              </p>
            ) : null}

            <Table>
              <thead>
                <tr>
                  <Th>Row</Th>
                  <Th>Status</Th>
                  {fields.slice(0, 4).map((f) => (
                    <Th key={f.column}>{f.column}</Th>
                  ))}
                  <Th>Problems</Th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={cn(row.errors.length > 0 && "bg-error-50/40")}
                  >
                    <Td className="tabular-nums text-xs text-mist-500">{row.rowNumber}</Td>
                    <Td>
                      <Badge tone={row.errors.length === 0 ? "positive" : "critical"}>
                        {row.errors.length === 0 ? "ok" : "error"}
                      </Badge>
                    </Td>
                    {fields.slice(0, 4).map((f) => (
                      <Td key={f.column} className="max-w-[200px] truncate text-xs">
                        {row.raw[f.column] || <span className="text-mist-500">—</span>}
                      </Td>
                    ))}
                    <Td className="text-xs text-error-700">
                      {row.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {report.totalRows > report.rows.length ? (
              <p className="border-t border-mist-200/70 px-6 py-3 text-xs text-mist-500 dark:border-night-800">
                Showing the first {report.rows.length} of {report.totalRows} rows. All rows were validated.
              </p>
            ) : null}
          </Panel>

          {/* ------------------------------------------------ 4. confirm */}
          <Panel title="Confirm">
            <div className="px-6 py-5">
              {committed ? (
                <>
                  <FormMessage notice={state.notice} />
                  <Link
                    href={target === "healers" ? "/admin/healers" : "/admin/blog"}
                    className="mt-4 inline-block text-sm underline underline-offset-4"
                  >
                    {target === "healers" ? "View healers" : "View the journal"}
                  </Link>
                </>
              ) : report.errorCount > 0 ? (
                <>
                  <p className="text-sm text-ink-600 dark:text-mist-400">
                    {report.errorCount} row{report.errorCount === 1 ? "" : "s"} still
                    {report.errorCount === 1 ? " has" : " have"} problems, so nothing can be
                    imported yet. Rows are not skipped — fix the file and upload it again.
                  </p>
                  <button
                    type="button"
                    onClick={downloadErrors}
                    className="mt-4 h-10 rounded-full px-4 text-sm font-medium hairline transition-colors hover:bg-ink-900/[0.035] dark:hover:bg-surface-0/[0.06]"
                  >
                    Download error report
                  </button>
                </>
              ) : report.missingColumns.length > 0 || !report.batchId ? (
                <p className="text-sm text-ink-600 dark:text-mist-400">
                  This file cannot be imported as it stands.
                </p>
              ) : (
                <form action={formAction}>
                  <input type="hidden" name="target" value={target} />
                  <input type="hidden" name="batchId" value={report.batchId} />
                  <p className="mb-4 text-sm text-ink-600 dark:text-mist-400">
                    All {report.validCount} rows validated.{" "}
                    {target === "healers"
                      ? "Healers are created as drafts with calendars closed, so nobody becomes bookable until they set availability."
                      : "Existing pieces with a matching slug are updated rather than duplicated."}
                  </p>
                  {state.error ? <FormMessage error={state.error} /> : null}
                  {state.messages?.length ? (
                    <ul className="mb-3 space-y-1 text-xs text-error-700">
                      {state.messages.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  ) : null}
                  <SubmitButton
                    label={`Import ${report.validCount} row${report.validCount === 1 ? "" : "s"}`}
                    pendingLabel="Importing…"
                  />
                </form>
              )}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
