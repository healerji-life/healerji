import "server-only";
import { inflateRawSync, inflateSync } from "node:zlib";

/**
 * Reading CSV and XLSX, with no third-party dependency.
 *
 * Pass 3 wrote an XLSX *writer* the same way. This is the reader: unzip the
 * archive, pull xl/worksheets/sheet1.xml and xl/sharedStrings.xml, and walk the
 * cells. Real spreadsheets from Excel, Numbers and Google Sheets all use this
 * shape.
 *
 * Everything returns strings. Coercion belongs to the per-dataset validator,
 * which knows what a field means — a reader that guessed types would silently
 * turn a slug like "007" into the number 7.
 */

export interface Sheet {
  /** First row, lower-cased and trimmed, used to map columns. */
  headers: string[];
  /** Data rows; index 0 is the first row AFTER the header. */
  rows: string[][];
}

// -------------------------------------------------------------------- CSV ----

/**
 * RFC 4180 parser written as a state machine rather than split(",").
 *
 * Necessary because healer bios and article bodies routinely contain commas,
 * quoted quotes and embedded newlines — a naive split corrupts exactly the rows
 * a person cares most about.
 */
export function parseCsv(text: string): Sheet {
  // Strip a UTF-8 BOM, which Excel writes and which would otherwise become part
  // of the first header name.
  const input = text.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i] as string;

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; continue; }
        inQuotes = false;
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') { inQuotes = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\r") continue;
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  // Final field / row, when the file does not end with a newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  const headerRow = nonEmpty.shift() ?? [];

  return {
    headers: headerRow.map((h) => h.trim().toLowerCase()),
    rows: nonEmpty,
  };
}

// ------------------------------------------------------------------- XLSX ----

interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Reads a zip central directory.
 *
 * Parsing the central directory rather than scanning for local headers matters:
 * local headers can carry streamed sizes of zero, whereas the central directory
 * is authoritative.
 */
function readZip(buffer: Buffer): ZipEntry[] {
  // End of central directory: signature 0x06054b50, searched from the tail
  // because it is followed by a variable-length comment.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 70000; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("Not a zip archive");

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    // Local header: fixed 30 bytes, then name and extra of their own lengths.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw);
    else {
      try { data = inflateSync(raw); } catch { data = Buffer.alloc(0); }
    }

    entries.push({ name, data });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    // Ampersand last, or the replacements above would double-decode.
    .replace(/&amp;/g, "&");
}

/** "C7" -> 2 (zero-based column index) */
function columnIndex(ref: string): number {
  const letters = /^([A-Z]+)/.exec(ref)?.[1] ?? "A";
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

export function parseXlsx(buffer: Buffer): Sheet {
  const entries = readZip(buffer);
  const byName = new Map(entries.map((e) => [e.name, e.data]));

  // Shared strings: most text cells are references into this table.
  const sharedXml = byName.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared: string[] = [];
  for (const match of sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    // An <si> may hold several <t> runs when part of the text is styled.
    const runs = [...(match[1] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1] ?? "");
    shared.push(decodeXmlEntities(runs.join("")));
  }

  // First worksheet. Numbers and Sheets do not always call it sheet1.xml.
  const sheetName =
    [...byName.keys()].find((name) => /^xl\/worksheets\/sheet1\.xml$/.test(name)) ??
    [...byName.keys()].find((name) => /^xl\/worksheets\/.+\.xml$/.test(name));
  if (!sheetName) throw new Error("No worksheet found in that workbook");

  const sheetXml = byName.get(sheetName)?.toString("utf8") ?? "";
  const grid: string[][] = [];

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1] ?? "";
      const inner = cellMatch[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "";
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? "n";

      let value = "";
      if (type === "inlineStr") {
        const runs = [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1] ?? "");
        value = decodeXmlEntities(runs.join(""));
      } else if (type === "s") {
        const index = Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "-1");
        value = shared[index] ?? "";
      } else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "";
        value = decodeXmlEntities(raw);
      }

      // Honour the cell reference, so a sparse row keeps its columns aligned.
      const at = ref ? columnIndex(ref) : cells.length;
      while (cells.length < at) cells.push("");
      cells[at] = value;
    }
    grid.push(cells);
  }

  const nonEmpty = grid.filter((r) => r.some((cell) => (cell ?? "").trim() !== ""));
  const headerRow = nonEmpty.shift() ?? [];

  return {
    headers: headerRow.map((h) => (h ?? "").trim().toLowerCase()),
    rows: nonEmpty,
  };
}

/** Dispatches on filename, since browsers report inconsistent MIME types. */
export function parseSpreadsheet(filename: string, buffer: Buffer): Sheet {
  if (/\.csv$/i.test(filename) || /\.tsv$/i.test(filename)) {
    return parseCsv(buffer.toString("utf8"));
  }
  if (/\.xlsx$/i.test(filename) || /\.xlsm$/i.test(filename)) {
    return parseXlsx(buffer);
  }
  // Fall back on content: a zip begins "PK".
  if (buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return parseXlsx(buffer);
  }
  return parseCsv(buffer.toString("utf8"));
}
