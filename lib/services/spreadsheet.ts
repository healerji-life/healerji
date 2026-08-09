import "server-only";
import { deflateRawSync } from "node:zlib";

/**
 * CSV and XLSX writers, with no third-party dependency.
 *
 * XLSX is a zip of OOXML parts. Rather than add a spreadsheet library the build
 * environment could not install, this builds the archive directly — so
 * "Export XLSX" produces a file Excel and Numbers genuinely open, instead of a
 * CSV with the wrong extension or a button that does nothing.
 *
 * Deliberately minimal: one sheet, inline strings, bold header row.
 */

export interface Column<T> {
  key: string;
  header: string;
  /** Return a string for text, a number for numeric cells. */
  value: (row: T) => string | number | null;
}

// ------------------------------------------------------------------- CSV ----

/**
 * RFC 4180 quoting, plus a formula-injection guard.
 *
 * The leading apostrophe on = + - @ is not cosmetic. Without it, a cell holding
 * "=cmd|'/c calc'!A1" executes when a colleague opens the export in Excel.
 * Exported values originate in user input, so they must be neutralised.
 */
function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return /[",\n\r]/.test(guarded) ? '"' + guarded.replace(/"/g, '""') + '"' : guarded;
}

/** U+FEFF, so Excel on Windows reads UTF-8 instead of mangling Devanagari. */
const BOM = "﻿";

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.value(row))).join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

// ------------------------------------------------------------------ XLSX ----

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i] as number;
    crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ byte) & 0xff] as number);
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Characters below U+0020 (other than tab, LF, CR) are illegal in XML 1.0. One
 * stray byte pasted into a healer bio would make the whole workbook unopenable
 * rather than merely untidy, so they are stripped.
 */
const ILLEGAL_XML = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(ILLEGAL_XML, "");
}

/** 0 -> A, 26 -> AA */
function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Minimal zip writer: deflated entries, central directory, EOCD.
 * The byte layout was validated against a standards-compliant zip reader.
 */
function buildZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data, { level: 6 });
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // local header signature
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0, 6);            // flags
    local.writeUInt16LE(8, 8);            // method: deflate
    local.writeUInt16LE(0, 10);           // mod time
    local.writeUInt16LE(0, 12);           // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central header signature
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([Buffer.concat(locals), centralBuf, eocd]);
}

const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKGNS = "http://schemas.openxmlformats.org/package/2006/relationships";

export function toXlsx<T>(sheetName: string, rows: T[], columns: Column<T>[]): Buffer {
  // Excel rejects sheet names containing \ / * ? : [ ] or longer than 31 chars.
  const safeSheet = escapeXml(sheetName.replace(/[\\/*?:[\]]/g, " ").slice(0, 31)) || "Sheet1";

  const sheetRows: string[] = [
    '<row r="1">' +
      columns
        .map(
          (c, i) =>
            '<c r="' + columnName(i) + '1" t="inlineStr" s="1"><is><t>' +
            escapeXml(c.header) + "</t></is></c>"
        )
        .join("") +
      "</row>",
  ];

  rows.forEach((row, rowIndex) => {
    const r = rowIndex + 2;
    const cells = columns
      .map((col, colIndex) => {
        const value = col.value(row);
        const ref = columnName(colIndex) + r;
        if (value === null || value === undefined || value === "") return "";
        if (typeof value === "number" && Number.isFinite(value)) {
          return '<c r="' + ref + '"><v>' + value + "</v></c>";
        }
        return '<c r="' + ref + '" t="inlineStr"><is><t>' + escapeXml(String(value)) + "</t></is></c>";
      })
      .join("");
    sheetRows.push('<row r="' + r + '">' + cells + "</row>");
  });

  const cols = columns
    .map(
      (c, i) =>
        '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' +
        Math.min(48, Math.max(12, c.header.length + 6)) + '" customWidth="1"/>'
    )
    .join("");

  const sheetXml =
    DECL + '<worksheet xmlns="' + NS + '"><cols>' + cols + "</cols><sheetData>" +
    sheetRows.join("") + "</sheetData></worksheet>";

  const workbookXml =
    DECL + '<workbook xmlns="' + NS + '" xmlns:r="' + RELNS + '">' +
    '<sheets><sheet name="' + safeSheet + '" sheetId="1" r:id="rId1"/></sheets></workbook>';

  const stylesXml =
    DECL + '<styleSheet xmlns="' + NS + '">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
    "</styleSheet>";

  const part = (name: string, xml: string): ZipEntry => ({ name, data: Buffer.from(xml, "utf8") });

  return buildZip([
    part(
      "[Content_Types].xml",
      DECL +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        "</Types>"
    ),
    part(
      "_rels/.rels",
      DECL + '<Relationships xmlns="' + PKGNS + '">' +
        '<Relationship Id="rId1" Type="' + RELNS + '/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>"
    ),
    part("xl/workbook.xml", workbookXml),
    part(
      "xl/_rels/workbook.xml.rels",
      DECL + '<Relationships xmlns="' + PKGNS + '">' +
        '<Relationship Id="rId1" Type="' + RELNS + '/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="' + RELNS + '/styles" Target="styles.xml"/>' +
        "</Relationships>"
    ),
    part("xl/styles.xml", stylesXml),
    part("xl/worksheets/sheet1.xml", sheetXml),
  ]);
}
