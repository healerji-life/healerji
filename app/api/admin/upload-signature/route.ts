import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/session";
import { createUploadSignature, UPLOAD_FOLDERS, type UploadFolder } from "@/lib/services/media";
import type { Permission } from "@/lib/auth/roles";

/**
 * Mints a short-lived Cloudinary upload signature.
 *
 * Guarded by authorise(), so an anonymous caller cannot obtain one and use our
 * Cloudinary quota. The folder is chosen from a fixed allowlist rather than
 * taken from the request, so a caller cannot sign an upload into an arbitrary
 * path.
 *
 * The permission is the one that governs the content the image belongs to. A
 * single healers.manage check used to guard every folder, which meant an editor
 * — who may write articles, practices and the team page but not healers — was
 * refused a signature for the very images those screens ask them to upload.
 */
const FOLDER_PERMISSION: Record<UploadFolder, Permission> = {
  [UPLOAD_FOLDERS.healers]: "healers.manage",
  [UPLOAD_FOLDERS.articles]: "content.blog.manage",
  [UPLOAD_FOLDERS.practices]: "content.practices.manage",
  [UPLOAD_FOLDERS.team]: "content.pages.manage",
};

export async function POST(request: Request) {
  // Authenticate before parsing the body, so an anonymous caller cannot probe
  // which upload folders exist.
  const session = await authorise();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await request.json().catch(() => null)) as { folder?: string } | null;
  const requested = body?.folder ?? "";
  const allowed = Object.values(UPLOAD_FOLDERS) as string[];
  if (!allowed.includes(requested)) {
    return NextResponse.json({ error: "Unknown upload folder." }, { status: 400 });
  }
  const folder = requested as UploadFolder;

  // Then the permission that governs the content this image belongs to.
  const auth = await authorise(FOLDER_PERMISSION[folder]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = createUploadSignature(folder);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json(result.data);
}
