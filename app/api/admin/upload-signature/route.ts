import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/session";
import { createUploadSignature, UPLOAD_FOLDERS, type UploadFolder } from "@/lib/services/media";

/**
 * Mints a short-lived Cloudinary upload signature.
 *
 * Guarded by authorise(), so an anonymous caller cannot obtain one and use our
 * Cloudinary quota. The folder is chosen from a fixed allowlist rather than
 * taken from the request, so a caller cannot sign an upload into an arbitrary
 * path.
 */
export async function POST(request: Request) {
  const auth = await authorise("healers.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as { folder?: string } | null;
  const requested = body?.folder ?? "";
  const allowed = Object.values(UPLOAD_FOLDERS) as string[];
  if (!allowed.includes(requested)) {
    return NextResponse.json({ error: "Unknown upload folder." }, { status: 400 });
  }

  const result = createUploadSignature(requested as UploadFolder);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json(result.data);
}
