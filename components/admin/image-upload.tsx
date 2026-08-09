"use client";

import { useRef, useState } from "react";

/**
 * Cloudinary upload.
 *
 * The file goes browser → Cloudinary directly, using a signature minted by
 * /api/admin/upload-signature. The binary never touches a Vercel function, the
 * repository or Postgres — only the returned URL is stored.
 *
 * When Cloudinary is not configured the control says so and disables itself.
 * It does not show a working-looking picker that fails on click, and it offers
 * a URL field so an admin is not blocked while credentials are pending.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function ImageUpload({
  name, altName, initialUrl, initialAlt, folder, configured, label,
}: {
  name: string;
  altName: string;
  initialUrl?: string | null;
  initialAlt?: string | null;
  folder: string;
  configured: boolean;
  label: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setMessage(null);

    if (!ACCEPTED.includes(file.type)) {
      setStatus("error");
      setMessage("That file type isn't supported. Use JPEG, PNG, WebP or AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setMessage(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
      return;
    }

    setStatus("uploading");
    try {
      const signRes = await fetch("/api/admin/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!signRes.ok) {
        const body = await signRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Could not obtain an upload signature.");
      }
      const sig = await signRes.json();

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("folder", sig.folder);
      form.append("transformation", sig.transformation);
      form.append("signature", sig.signature);

      const uploadRes = await fetch(sig.uploadUrl, { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error("Cloudinary rejected that upload.");

      const result = await uploadRes.json();
      if (!result.secure_url) throw new Error("Cloudinary returned no URL.");

      setUrl(result.secure_url);
      setStatus("idle");
      // Deliberately not "Saved!" — the record is only written when the form
      // itself is submitted.
      setMessage("Uploaded. Save the profile to apply it.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "That upload failed.");
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>

      <div className="flex flex-wrap items-start gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-50 dark:bg-night-950">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-mist-500">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {configured ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={status === "uploading"}
                  onClick={() => inputRef.current?.click()}
                  className="h-9 rounded-full px-4 text-sm font-medium hairline disabled:opacity-40"
                >
                  {status === "uploading" ? "Uploading…" : url ? "Replace" : "Upload"}
                </button>
                {url ? (
                  <button
                    type="button"
                    onClick={() => { setUrl(""); setMessage("Removed. Save the profile to apply it."); }}
                    className="h-9 rounded-full px-4 text-sm hairline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-mist-500">
                JPEG, PNG, WebP or AVIF up to 5 MB. Resized to 1600px on upload.
              </p>
            </>
          ) : (
            <div className="rounded-sm bg-surface-50 p-3 text-xs dark:bg-night-950">
              <p className="font-medium">Cloudinary is not configured.</p>
              <p className="mt-1 text-mist-500">
                Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
                CLOUDINARY_API_SECRET to enable uploads. You can paste an image
                URL below in the meantime.
              </p>
            </div>
          )}

          <input
            type="url"
            name={name}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-3 h-10 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />

          <label className="mt-2 block">
            <span className="mb-1 block text-xs text-mist-500">
              Alt text — describes the image for screen readers
            </span>
            <input
              type="text"
              name={altName}
              defaultValue={initialAlt ?? ""}
              className="h-10 w-full rounded-sm bg-surface-50 px-3 text-sm outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
            />
          </label>

          {message ? (
            <p
              role={status === "error" ? "alert" : "status"}
              className={status === "error" ? "mt-2 text-xs text-error-700" : "mt-2 text-xs text-mist-500"}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
