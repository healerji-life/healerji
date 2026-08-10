/**
 * Folder names shared with client components.
 *
 * lib/services/media.ts is server-only (it reads CLOUDINARY_API_SECRET), so a
 * client component cannot import the constants from there. These are the same
 * values, and the API route validates whatever is sent against its own copy —
 * this is a convenience, never a trust boundary.
 */
export const UPLOAD_FOLDERS_PUBLIC = {
  healers: "healerji/healers",
  articles: "healerji/articles",
  practices: "healerji/practices",
  team: "healerji/team",
} as const;
