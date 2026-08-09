import "server-only";

/**
 * A minimal PDF writer, with no third-party dependency.
 *
 * PDF is a simple object graph plus a byte-offset cross-reference table, so a
 * table report needs no library. Uses the core Helvetica fonts, which every
 * reader has built in — nothing is embedded, so files stay small.
 *
 * Scope, deliberately: portrait or landscape A4, a title block, a header row and
 * paginated data rows. That is what an operational report needs. Anything
 * fancier belongs in the XLSX export, which is the format people actually
 * manipulate.
 */

export interface PdfColumn<T> {
  header: string;
  /** Fraction of the usable width, 0–1. All columns should sum to ~1. */
  width: number;
  value: (row: T) => string;
  align?: "left" | "right";
}

export interface PdfMeta {
  title: string;
  subtitle?: string;
  /** Rendered bottom-left on every page. */
  footer?: string;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const FONT_SIZE = 8.5;
const HEADER_SIZE = 8.5;
const LINE_HEIGHT = 14;

/** Helvetica widths are ~0.5em on average; enough to truncate sensibly. */
function truncateToWidth(text: string, points: number, size: number): string {
  const perChar = size * 0.5;
  const max = Math.max(1, Math.floor(points / perChar));
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

/**
 * PDF strings are escaped for \ ( ) and non-Latin-1 characters are dropped.
 *
 * That last part is a real limitation, stated plainly: WinAnsi core fonts cannot
 * render Devanagari, so a healer name in Hindi would appear as blanks. Use the
 * XLSX or CSV export for any dataset containing non-Latin text — those are UTF-8
 * and lossless.
 */
function pdfString(text: string): string {
  return text
    .replace(/[Ā-￿]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function buildPdfTable<T>(
  rows: T[],
  columns: PdfColumn<T>[],
  meta: PdfMeta,
  options: { landscape?: boolean } = {}
): Buffer {
  const pageWidth = options.landscape ? A4.height : A4.width;
  const pageHeight = options.landscape ? A4.width : A4.height;
  const usable = pageWidth - MARGIN * 2;

  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) || 1;
  const widths = columns.map((c) => (c.width / totalWidth) * usable);

  // Rows that fit below the title block on the first page, and below the header
  // row on subsequent ones.
  const firstPageTop = pageHeight - MARGIN - 54;
  const laterPageTop = pageHeight - MARGIN - 24;
  const bottom = MARGIN + 24;
  const firstPageRows = Math.max(1, Math.floor((firstPageTop - bottom) / LINE_HEIGHT) - 1);
  const laterPageRows = Math.max(1, Math.floor((laterPageTop - bottom) / LINE_HEIGHT) - 1);

  const pages: T[][] = [];
  let cursor = 0;
  while (cursor < rows.length) {
    const capacity = pages.length === 0 ? firstPageRows : laterPageRows;
    pages.push(rows.slice(cursor, cursor + capacity));
    cursor += capacity;
  }
  if (pages.length === 0) pages.push([]);

  const streams: string[] = pages.map((pageRows, pageIndex) => {
    const parts: string[] = [];
    let y = pageIndex === 0 ? firstPageTop : laterPageTop;

    if (pageIndex === 0) {
      parts.push(
        `BT /F2 15 Tf ${MARGIN} ${pageHeight - MARGIN - 12} Td (${pdfString(meta.title)}) Tj ET`
      );
      if (meta.subtitle) {
        parts.push(
          `BT /F1 9 Tf 0.45 0.42 0.45 rg ${MARGIN} ${pageHeight - MARGIN - 28} Td (${pdfString(meta.subtitle)}) Tj ET 0 0 0 rg`
        );
      }
    }

    // Header row.
    let x = MARGIN;
    columns.forEach((column, i) => {
      const width = widths[i] ?? 0;
      const label = truncateToWidth(column.header.toUpperCase(), width - 4, HEADER_SIZE);
      const tx = column.align === "right" ? x + width - 4 - label.length * HEADER_SIZE * 0.5 : x;
      parts.push(`BT /F2 ${HEADER_SIZE} Tf 0.45 0.42 0.45 rg ${tx} ${y} Td (${pdfString(label)}) Tj ET 0 0 0 rg`);
      x += width;
    });

    // Rule under the header.
    parts.push(`0.85 0.84 0.85 RG 0.6 w ${MARGIN} ${y - 5} m ${MARGIN + usable} ${y - 5} l S`);
    y -= LINE_HEIGHT + 2;

    for (const row of pageRows) {
      x = MARGIN;
      columns.forEach((column, i) => {
        const width = widths[i] ?? 0;
        const text = truncateToWidth(column.value(row) ?? "", width - 4, FONT_SIZE);
        const tx = column.align === "right" ? x + width - 4 - text.length * FONT_SIZE * 0.5 : x;
        parts.push(`BT /F1 ${FONT_SIZE} Tf ${tx} ${y} Td (${pdfString(text)}) Tj ET`);
        x += width;
      });
      y -= LINE_HEIGHT;
    }

    const footer = `${meta.footer ?? "HealerJi"} · page ${pageIndex + 1} of ${pages.length}`;
    parts.push(`BT /F1 7.5 Tf 0.55 0.53 0.55 rg ${MARGIN} ${MARGIN - 6} Td (${pdfString(footer)}) Tj ET 0 0 0 rg`);

    return parts.join("\n");
  });

  // ------------------------------------------------------------- assemble ----
  const objects: string[] = [];
  const pageCount = pages.length;

  // 1 catalog, 2 pages tree, 3 F1, 4 F2, then per page: content stream + page.
  const contentIds: number[] = [];
  const pageIds: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    contentIds.push(5 + i * 2);
    pageIds.push(6 + i * 2);
  }

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] =
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  streams.forEach((stream, i) => {
    const bytes = Buffer.byteLength(stream, "latin1");
    objects[contentIds[i] as number] = `<< /Length ${bytes} >>\nstream\n${stream}\nendstream`;
    objects[pageIds[i] as number] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    const body = objects[id];
    if (body === undefined) continue;
    offsets[id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  const maxId = objects.length - 1;
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    const offset = offsets[id];
    // Free entry for any gap, so the table stays the correct length.
    pdf += offset === undefined
      ? `0000000000 65535 f \n`
      : `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
