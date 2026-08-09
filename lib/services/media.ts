import "server-only";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { err, fromPostgrestError, NOT_CONFIGURED, ok, type Result } from "@/lib/services/types";
import { isConfigured } from "@/lib/services/integrations";

/**
 * Cloudinary.
 *
 * Uploads go browser → Cloudinary directly, signed by this server. The image
 * binary never passes through a Vercel function (which has a body-size limit
 * and would be a pointless hop), never lands in the repository, and never goes
 * into Postgres — only the resulting URL and public_id are stored.
 *
 * The signature is generated here because CLOUDINARY_API_SECRET is server-only.
 * It commits to the folder and timestamp, so a signature cannot be reused to
 * upload somewhere it was not intended.
 */

export const UPLOAD_FOLDERS = {
  healers: "healerji/healers",
  articles: "healerji/articles",
  practices: "healerji/practices",
} as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Applied by Cloudinary at upload time so we never store an unbounded original. */
  transformation: string;
  uploadUrl: string;
}

export function createUploadSignature(folder: UploadFolder): Result<UploadSignature> {
  if (!isConfigured("cloudinary")) return NOT_CONFIGURED("Cloudinary");

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NOT_CONFIGURED("Cloudinary");

  const timestamp = Math.floor(Date.now() / 1000);
  // Cap the stored original: 1600px longest edge, auto quality and format.
  const transformation = "c_limit,w_1600,h_1600,q_auto:good";

  // Cloudinary's scheme: alphabetical key=value pairs joined by &, then the
  // secret appended, hashed with SHA-1.
  const params: Record<string, string | number> = { folder, timestamp, transformation };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const signature = crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");

  return ok({
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
    transformation,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  });
}

export interface StoredAsset {
  id: string;
  secureUrl: string;
  publicId: string;
}

/** Records what Cloudinary returned, so assets are inventoried and reusable. */
export async function recordAsset(params: {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  altText?: string;
  folder?: string;
  uploadedBy?: string;
}): Promise<Result<StoredAsset>> {
  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED("Supabase");

  const { data, error } = await supabase
    .from("media_assets")
    .upsert(
      {
        provider: "cloudinary",
        public_id: params.publicId,
        secure_url: params.secureUrl,
        width: params.width ?? null,
        height: params.height ?? null,
        bytes: params.bytes ?? null,
        format: params.format ?? null,
        alt_text: params.altText ?? null,
        folder: params.folder ?? null,
        uploaded_by: params.uploadedBy ?? null,
      },
      { onConflict: "provider,public_id" }
    )
    .select("id, secure_url, public_id")
    .single();

  if (error) return fromPostgrestError(error, "We couldn't record that image.");
  return ok({ id: data.id, secureUrl: data.secure_url, publicId: data.public_id });
}

/**
 * Deletes from Cloudinary. Returns not_configured rather than pretending to
 * succeed when credentials are absent — a "deleted" toast over a live image
 * would be a lie.
 */
export async function deleteAsset(publicId: string): Promise<Result<null>> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NOT_CONFIGURED("Cloudinary");

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  try {
    const body = new URLSearchParams({
      public_id: publicId,
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
    });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body,
    });
    if (!response.ok) return err("upstream", "Cloudinary refused that deletion.");
    return ok(null);
  } catch {
    return err("upstream", "We couldn't reach Cloudinary.");
  }
}

/** Builds a resized delivery URL from a stored Cloudinary URL. */
export function cloudinaryThumb(url: string | null, width = 96): string | null {
  if (!url) return null;
  const marker = "/upload/";
  const at = url.indexOf(marker);
  if (at === -1) return url;
  return `${url.slice(0, at + marker.length)}c_fill,g_face,w_${width},h_${width},q_auto,f_auto/${url.slice(at + marker.length)}`;
}
