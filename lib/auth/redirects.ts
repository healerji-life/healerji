/**
 * The one open-redirect guard.
 *
 * `next` always arrives from a query string or a form field, so it is attacker
 * controlled everywhere it is used. This lived as a private helper inside
 * `lib/auth/actions.ts` while `app/auth/callback/route.ts` carried its own
 * slightly weaker inline copy — the callback checked for a leading `//` but not
 * for a backslash, which some browsers normalise to `/`. Two implementations of
 * one security rule is one implementation too many.
 *
 * It cannot live in `actions.ts`: that file is `"use server"`, and a server
 * action module may only export async functions.
 *
 * The rule: only same-site absolute paths are ever followed.
 *   - must start with `/`            — no scheme, no host
 *   - must not start with `//`       — no protocol-relative URL
 *   - must not contain a backslash   — `/\evil.com` is normalised by some
 *                                      browsers into a host change
 *   - must not contain a control character, space or DEL, which can be used to
 *     split a Location header or smuggle a second target past a naive check
 */
function hasControlOrSpace(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function isSafeRedirect(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  if (hasControlOrSpace(value)) return false;
  return true;
}

/** `value` when it is a safe same-site path, otherwise `fallback`. */
export function safeRedirectOr(value: string | null | undefined, fallback: string): string {
  return value && isSafeRedirect(value) ? value : fallback;
}
