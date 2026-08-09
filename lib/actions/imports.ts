"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorise } from "@/lib/auth/session";
import { commitImport, IMPORT_PERMISSION, type ImportTarget } from "@/lib/services/imports";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/services/audit";

export interface ImportCommitState {
  error?: string;
  notice?: string;
  messages?: string[];
}

/**
 * Commits a previously previewed batch.
 *
 * Separate from the upload on purpose: the confirm step is the only thing that
 * writes to a production table, and it operates on the STAGED rows rather than
 * re-parsing, so what is imported is exactly what was previewed.
 */
export async function commitImportAction(
  _prev: ImportCommitState,
  formData: FormData
): Promise<ImportCommitState> {
  const target = String(formData.get("target") ?? "");
  if (target !== "healers" && target !== "articles") return { error: "Unknown import target." };

  const auth = await authorise(IMPORT_PERMISSION[target as ImportTarget]);
  if (!auth.ok) return { error: auth.error };

  const batchId = String(formData.get("batchId") ?? "");
  if (!z.string().uuid().safeParse(batchId).success) {
    return { error: "That import could not be found. Please upload the file again." };
  }

  const result = await commitImport(batchId, auth.viewer.id);
  if (!result.ok) return { error: result.error.message };

  await recordAudit({
    viewer: auth.viewer,
    action: target === "healers" ? AUDIT_ACTIONS.healerImported : AUDIT_ACTIONS.blogImported,
    resourceType: target === "healers" ? "healer" : "article",
    resourceId: batchId,
    summary: `Imported ${result.data.imported} ${target} row(s) from a spreadsheet`,
    after: { imported: result.data.imported, failed: result.data.failed },
  });

  if (target === "healers") {
    revalidatePath("/admin/healers");
    revalidatePath("/healers");
  } else {
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/library");
  }

  if (result.data.failed > 0) {
    return {
      error: `Imported ${result.data.imported}, but ${result.data.failed} failed.`,
      ...(result.data.messages.length > 0 ? { messages: result.data.messages } : {}),
    };
  }

  return {
    notice:
      target === "healers"
        ? `Imported ${result.data.imported} healer(s) as drafts, with calendars closed until each sets availability.`
        : `Imported ${result.data.imported} piece(s).`,
  };
}
