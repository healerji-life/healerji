import "server-only";
import { toCsv, toXlsx, type Column } from "@/lib/services/spreadsheet";
import { buildPdfTable, type PdfColumn } from "@/lib/services/pdf";
import { listHealersForAdmin, type HealerFilters } from "@/lib/services/healers";
import { listBookings, type BookingFilters } from "@/lib/services/bookings";
import { listPayments, type PaymentFilters } from "@/lib/services/payments";
import { listCustomers, type CustomerFilters } from "@/lib/services/customers";
import { listArticlesForAdmin, type ArticleFilters } from "@/lib/services/articles";
import { err, ok, type Result } from "@/lib/services/types";
import type { Permission } from "@/lib/auth/roles";

/**
 * Exports.
 *
 * Each dataset declares the permission it needs and whether it counts as
 * sensitive. Two consequences, both required:
 *
 *   - An editor cannot export customers or payments. The permission is checked
 *     by the route before this runs, and RLS returns no rows even if it were
 *     not (requirement 53).
 *   - Sensitive exports are written to the audit log, so there is a record of
 *     who took a copy of the customer list and when.
 *
 * Exports reuse the same list services and the same filters as the screen, so
 * "export what I am looking at" is literally that — not a second query that
 * might disagree.
 */

export type ExportDataset = "healers" | "bookings" | "payments" | "customers" | "articles";
export type ExportFormat = "csv" | "xlsx" | "pdf";

export const EXPORT_PERMISSION: Record<ExportDataset, Permission> = {
  healers: "healers.view",
  bookings: "bookings.view.all",
  payments: "payments.export",
  customers: "customers.export",
  articles: "content.blog.manage",
};

/** Datasets whose export is recorded in the audit log. */
export const SENSITIVE_DATASETS: ExportDataset[] = ["customers", "payments", "bookings"];

/** Cap so an export cannot become an accidental denial of service. */
const MAX_ROWS = 5000;

const rupees = (paise: number | null | undefined): number =>
  paise === null || paise === undefined ? 0 : Math.round(paise) / 100;

export interface ExportResult {
  filename: string;
  contentType: string;
  body: Buffer | string;
  rowCount: number;
}

export async function buildExport(
  dataset: ExportDataset,
  format: ExportFormat,
  params: Record<string, string | undefined>
): Promise<Result<ExportResult>> {
  const stamp = new Date().toISOString().slice(0, 10);

  switch (dataset) {
    case "healers": {
      const filters: HealerFilters = {
        pageSize: MAX_ROWS,
        ...(params.q ? { search: params.q } : {}),
        ...(params.status ? { status: params.status as HealerFilters["status"] } : {}),
        ...(params.modality ? { modality: params.modality } : {}),
        ...(params.featured === "1" ? { featured: true } : {}),
      };
      const result = await listHealersForAdmin(filters);
      if (!result.ok) return result;
      const columns: Column<(typeof result.data.rows)[number]>[] = [
        { key: "name", header: "Name", value: (r) => r.name },
        { key: "slug", header: "Slug", value: (r) => r.slug },
        { key: "status", header: "Status", value: (r) => r.status },
        { key: "headline", header: "Headline", value: (r) => r.headline },
        { key: "years", header: "Years", value: (r) => r.years },
        { key: "rate", header: "Rate (INR, 45 min)", value: (r) => rupees(r.price_paise) },
        { key: "featured", header: "Featured", value: (r) => (r.featured ? "Yes" : "No") },
        { key: "order", header: "Display order", value: (r) => r.display_order },
        { key: "identity", header: "Identity verified", value: (r) => (r.verified_identity ? "Yes" : "No") },
        { key: "creds", header: "Credentials verified", value: (r) => (r.verified_credentials ? "Yes" : "No") },
        { key: "interview", header: "Interviewed", value: (r) => (r.verified_interviewed ? "Yes" : "No") },
        { key: "timezone", header: "Timezone", value: (r) => r.timezone },
        { key: "created", header: "Created", value: (r) => r.created_at.slice(0, 10) },
      ];
      return ok(render(`healerji-healers-${stamp}`, "Healers", result.data.rows, columns, format));
    }

    case "bookings": {
      const filters: BookingFilters = {
        pageSize: MAX_ROWS,
        ...(params.q ? { search: params.q } : {}),
        ...(params.status ? { status: params.status as BookingFilters["status"] } : {}),
        ...(params.payment ? { paymentStatus: params.payment as BookingFilters["paymentStatus"] } : {}),
        ...(params.healer ? { healerId: params.healer } : {}),
        ...(params.kind ? { sessionKind: params.kind as BookingFilters["sessionKind"] } : {}),
        ...(params.from ? { from: new Date(params.from).toISOString() } : {}),
        ...(params.to ? { to: new Date(`${params.to}T23:59:59`).toISOString() } : {}),
      };
      const result = await listBookings(filters);
      if (!result.ok) return result;
      const columns: Column<(typeof result.data.rows)[number]>[] = [
        { key: "reference", header: "Reference", value: (r) => r.reference },
        { key: "status", header: "Status", value: (r) => r.status },
        { key: "payment", header: "Payment", value: (r) => r.payment_status },
        { key: "kind", header: "Session type", value: (r) => r.session_kind },
        { key: "minutes", header: "Minutes", value: (r) => r.duration_minutes },
        { key: "starts", header: "Starts at", value: (r) => r.starts_at },
        { key: "amount", header: "Amount (INR)", value: (r) => rupees(r.amount_paise) },
        { key: "customer", header: "Customer", value: (r) => r.guest_name ?? "HealerJi member" },
        { key: "created", header: "Created", value: (r) => r.created_at },
        { key: "source", header: "Source page", value: (r) => r.source_route ?? "" },
      ];
      return ok(render(`healerji-bookings-${stamp}`, "Bookings", result.data.rows, columns, format));
    }

    case "payments": {
      const filters: PaymentFilters = {
        pageSize: MAX_ROWS,
        ...(params.q ? { search: params.q } : {}),
        ...(params.status ? { status: params.status as PaymentFilters["status"] } : {}),
        ...(params.from ? { from: new Date(params.from).toISOString() } : {}),
        ...(params.to ? { to: new Date(`${params.to}T23:59:59`).toISOString() } : {}),
      };
      const result = await listPayments(filters);
      if (!result.ok) return result;
      const columns: Column<(typeof result.data.rows)[number]>[] = [
        { key: "order", header: "Razorpay order ID", value: (r) => r.razorpayOrderId },
        { key: "payment", header: "Razorpay payment ID", value: (r) => r.razorpayPaymentId ?? "" },
        { key: "status", header: "Status", value: (r) => r.status },
        { key: "amount", header: "Amount (INR)", value: (r) => rupees(r.amountPaise) },
        { key: "refunded", header: "Refunded (INR)", value: (r) => rupees(r.amountRefundedPaise) },
        { key: "method", header: "Method", value: (r) => r.method ?? "" },
        { key: "verified", header: "Verified via", value: (r) => r.verifiedVia ?? "" },
        { key: "booking", header: "Booking", value: (r) => r.bookingReference ?? "" },
        { key: "healer", header: "Healer", value: (r) => r.healerName ?? "" },
        { key: "captured", header: "Captured at", value: (r) => r.capturedAt ?? "" },
        { key: "created", header: "Created", value: (r) => r.createdAt },
      ];
      return ok(render(`healerji-payments-${stamp}`, "Payments", result.data.rows, columns, format));
    }

    case "customers": {
      const filters: CustomerFilters = {
        pageSize: MAX_ROWS,
        ...(params.q ? { search: params.q } : {}),
        ...(params.provider ? { provider: params.provider as CustomerFilters["provider"] } : {}),
        ...(params.status ? { status: params.status as CustomerFilters["status"] } : {}),
      };
      const result = await listCustomers(filters);
      if (!result.ok) return result;
      // Note what is NOT here: no provider_account_id, no tokens, no internal
      // auth identifiers (requirement 20 / 54).
      const columns: Column<(typeof result.data.rows)[number]>[] = [
        { key: "name", header: "Name", value: (r) => r.fullName ?? "" },
        { key: "email", header: "Email", value: (r) => r.email },
        { key: "provider", header: "Sign-in method", value: (r) => r.provider },
        { key: "status", header: "Account status", value: (r) => r.status },
        { key: "created", header: "Registered", value: (r) => r.createdAt.slice(0, 10) },
        { key: "last", header: "Last sign-in", value: (r) => r.lastSignInAt?.slice(0, 10) ?? "" },
        { key: "bookings", header: "Bookings", value: (r) => r.bookingCount },
        { key: "upcoming", header: "Upcoming", value: (r) => r.upcomingCount },
        { key: "spend", header: "Total paid (INR)", value: (r) => rupees(r.totalSpendPaise) },
      ];
      return ok(render(`healerji-customers-${stamp}`, "Customers", result.data.rows, columns, format));
    }

    case "articles": {
      const filters: ArticleFilters = {
        pageSize: MAX_ROWS,
        ...(params.q ? { search: params.q } : {}),
        ...(params.status ? { status: params.status as ArticleFilters["status"] } : {}),
      };
      const result = await listArticlesForAdmin(filters);
      if (!result.ok) return result;
      const columns: Column<(typeof result.data.rows)[number]>[] = [
        { key: "title", header: "Title", value: (r) => r.title },
        { key: "slug", header: "Slug", value: (r) => r.slug },
        { key: "status", header: "Status", value: (r) => r.status },
        { key: "kind", header: "Kind", value: (r) => r.kind },
        { key: "category", header: "Category", value: (r) => r.category_slug ?? "" },
        { key: "author", header: "Author", value: (r) => r.author_name },
        { key: "minutes", header: "Read minutes", value: (r) => r.read_minutes },
        { key: "featured", header: "Featured", value: (r) => (r.featured ? "Yes" : "No") },
        { key: "published", header: "Published at", value: (r) => r.published_at ?? "" },
        { key: "tags", header: "Tags", value: (r) => r.tags.join(", ") },
      ];
      return ok(render(`healerji-blogs-${stamp}`, "Blogs", result.data.rows, columns, format));
    }

    default:
      return err("validation", "Unknown dataset.");
  }
}

function render<T>(
  base: string,
  sheet: string,
  rows: T[],
  columns: Column<T>[],
  format: ExportFormat
): ExportResult {
  if (format === "csv") {
    return {
      filename: `${base}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: toCsv(rows, columns),
      rowCount: rows.length,
    };
  }

  if (format === "pdf") {
    /**
     * PDF is for reading and circulating, not for manipulating, so it carries
     * the first 8 columns rather than everything — a 13-column table on A4 is
     * unreadable at any font size that fits.
     *
     * Core Helvetica cannot render Devanagari, so a dataset containing Hindi
     * names should be exported as XLSX or CSV instead. That limitation is stated
     * in lib/services/pdf.ts rather than silently dropping characters here.
     */
    const pdfColumns: PdfColumn<T>[] = columns.slice(0, 8).map((column) => ({
      header: column.header,
      width: 1 / Math.min(8, columns.length),
      value: (row: T) => {
        const value = column.value(row);
        return value === null || value === undefined ? "" : String(value);
      },
      ...(typeof column.value(rows[0] ?? ({} as T)) === "number" ? { align: "right" as const } : {}),
    }));

    return {
      filename: `${base}.pdf`,
      contentType: "application/pdf",
      body: buildPdfTable(
        rows,
        pdfColumns,
        {
          title: sheet,
          subtitle: `${rows.length} record${rows.length === 1 ? "" : "s"} · exported ${new Date().toLocaleString("en-IN")}`,
          footer: "HealerJi · confidential",
        },
        { landscape: columns.length > 5 }
      ),
      rowCount: rows.length,
    };
  }

  return {
    filename: `${base}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: toXlsx(sheet, rows, columns),
    rowCount: rows.length,
  };
}
