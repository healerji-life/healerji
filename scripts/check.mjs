/**
 * Static integrity checker.
 *
 * This is NOT a type checker and does not pretend to be one. It exists because
 * the build environment has no npm registry and therefore no `tsc`, and
 * shipping unverifiable code is worse than shipping less code.
 *
 * What it actually proves:
 *   1. every "@/…" import resolves to a real file
 *   2. every NAMED import actually exists as an export of that file
 *   3. every default import targets a file with a default export
 *   4. no "use client" module reaches a server-only module
 *   5. no "use client" module reads a non-NEXT_PUBLIC_ env var
 *   6. server actions files are marked "use server"
 *   7. React hooks are only used in "use client" modules
 *
 * Run: npm run check
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";

const root = process.cwd();
const problems = [];
const report = (file, message) => problems.push(`${relative(root, file)}: ${message}`);

// ---------------------------------------------------------------- discovery --
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", "public"].includes(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx|jsx|mjs)$/.test(entry.name)) files.push(p);
  }
})(root);

const EXTS = ["", ".ts", ".tsx", ".jsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.jsx"];

/**
 * Removes // line comments and block comments.
 *
 * Load-bearing: scanning raw source made a code comment mentioning
 * `useSearchParams()` look like a hook call, and a comment mentioning
 * SECURITY DEFINER look like a declaration. Patterns must never match prose.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

function resolveAlias(spec) {
  const base = resolve(root, spec.slice(2));
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// ------------------------------------------------------------ export index --
/** Collect exported names from a module, following `export * from` one level. */
const exportCache = new Map();

function exportsOf(file, seen = new Set()) {
  if (exportCache.has(file)) return exportCache.get(file);
  if (seen.has(file)) return { named: new Set(), hasDefault: false };
  seen.add(file);

  const src = readFileSync(file, "utf8");
  const named = new Set();
  let hasDefault = /export\s+default\b/.test(src);

  // export const/let/var/function/async function/class/type/interface/enum X
  const decl =
    /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of src.matchAll(decl)) named.add(m[1]);

  // export { a, b as c }
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(",")) {
      const piece = part.trim();
      if (!piece) continue;
      const asMatch = piece.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
      const name = asMatch ? asMatch[1] : piece.replace(/^type\s+/, "").trim();
      if (name === "default") hasDefault = true;
      else if (/^[A-Za-z_$][\w$]*$/.test(name)) named.add(name);
    }
  }

  // export { a } from './x'  /  export * from './x'
  for (const m of src.matchAll(/export\s+(?:type\s+)?(\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g)) {
    const spec = m[2];
    const target = spec.startsWith("@/") ? resolveAlias(spec)
      : spec.startsWith(".") ? resolveRelative(file, spec) : null;
    if (m[1] === "*") {
      if (target) for (const n of exportsOf(target, seen).named) named.add(n);
      else named.add("*"); // external re-export: stop asserting
    } else {
      for (const part of m[1].replace(/[{}]/g, "").split(",")) {
        const piece = part.trim();
        if (!piece) continue;
        const asMatch = piece.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
        named.add(asMatch ? asMatch[1] : piece.replace(/^type\s+/, "").trim());
      }
    }
  }

  const result = { named, hasDefault };
  exportCache.set(file, result);
  return result;
}

// ------------------------------------------------------------------ checks --
const clientModules = new Set();
const serverOnlyModules = new Set();

for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (/^\s*["']use client["']/m.test(src)) clientModules.add(file);
  if (/^\s*import\s+["']server-only["']/m.test(src)) serverOnlyModules.add(file);
}

const IMPORT_RE =
  /import\s+(?:type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const isClient = clientModules.has(file);

  for (const m of src.matchAll(IMPORT_RE)) {
    const clause = m[1];
    const spec = m[2] ?? m[3];
    if (!spec) continue;

    const target = spec.startsWith("@/") ? resolveAlias(spec)
      : spec.startsWith(".") ? resolveRelative(file, spec) : null;

    if ((spec.startsWith("@/") || spec.startsWith(".")) && !target) {
      report(file, `unresolved import "${spec}"`);
      continue;
    }
    if (!target) continue; // bare package

    // (4) client -> server-only
    if (isClient && serverOnlyModules.has(target)) {
      report(file, `"use client" module imports server-only module "${spec}"`);
    }

    if (!clause) continue;

    const { named, hasDefault } = exportsOf(target);
    if (named.has("*")) continue; // re-exports something external; cannot assert

    // default import: `import X from` or `import X, { y } from`
    const defaultMatch = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    if (defaultMatch && !clause.trim().startsWith("{") && !clause.trim().startsWith("*")) {
      if (!hasDefault) report(file, `"${spec}" has no default export (imported as ${defaultMatch[1]})`);
    }

    // named imports
    const braces = clause.match(/\{([\s\S]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const piece = part.trim().replace(/^type\s+/, "");
        if (!piece) continue;
        const name = piece.split(/\s+as\s+/)[0].trim();
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        if (!named.has(name)) {
          report(file, `"${spec}" does not export "${name}"`);
        }
      }
    }
  }

  const code = stripComments(src);

  // (5) client modules must not read server env vars
  if (isClient) {
    for (const m of code.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (!m[1].startsWith("NEXT_PUBLIC_")) {
        report(file, `"use client" module reads server env var ${m[1]}`);
      }
    }
  }

  // (6) files exporting server actions must be marked
  const hasServerActionShape = /"use server"/.test(code);
  if (!hasServerActionShape && !isClient && /\bexport\s+async\s+function\s+\w+\s*\(\s*(?:_?prev|prevState)\b/.test(code)) {
    report(file, `looks like a server-action module but has no "use server" directive`);
  }

  // (7) hooks outside client modules
  if (!isClient && /\b(useState|useEffect|useActionState|useFormStatus|useRouter|useSearchParams|useTransition|useOptimistic)\s*\(/.test(code)) {
    if (!/\.d\.ts$/.test(file)) {
      report(file, `uses React hooks but is not a "use client" module`);
    }
  }
}

// -------------------------------------------------- required-file manifest --
// A shell `&&` chain that fails midway can silently skip a file write. The
// admin layout went missing exactly that way once; asserting the structure
// costs nothing and catches it immediately.
const REQUIRED = [
  "middleware.ts",
  "app/admin/(portal)/layout.tsx",
  "app/admin/(portal)/dashboard/page.tsx",
  "app/admin/(portal)/healers/page.tsx",
  "app/admin/(portal)/healers/new/page.tsx",
  "app/admin/(portal)/healers/[id]/page.tsx",
  "app/admin/login/page.tsx",
  "app/healer/login/page.tsx",
  "app/healer/(portal)/layout.tsx",
  "app/healer/(portal)/dashboard/page.tsx",
  "app/healer/(portal)/availability/page.tsx",
  "app/auth/callback/route.ts",
  "lib/supabase/server.ts",
  "lib/supabase/admin.ts",
  "lib/auth/session.ts",
  "lib/auth/roles.ts",
  "lib/actions/healers.ts",
  // pass 3 — booking flow
  "lib/booking/window.ts",
  "app/api/booking/slots/route.ts",
  "app/api/booking/verify/route.ts",
  "app/api/checkout/route.ts",
  "app/api/razorpay-webhook/route.ts",
  "lib/actions/bookings.ts",
  "components/booking/cancel-button.tsx",
  // pass 3 — admin
  "app/admin/(portal)/bookings/page.tsx",
  "app/admin/(portal)/bookings/[id]/page.tsx",
  "app/admin/(portal)/payments/page.tsx",
  "app/admin/(portal)/customers/page.tsx",
  "app/admin/(portal)/customers/[id]/page.tsx",
  "lib/services/spreadsheet.ts",
  "lib/services/exports.ts",
  "lib/services/customers.ts",
  "lib/services/articles.ts",
  "app/api/admin/export/route.ts",
  // pass 4 — healer portal
  "lib/booking/schedule.ts",
  "lib/actions/availability.ts",
  "lib/actions/healer-self.ts",
  "components/healer/schedule-editor.tsx",
  "components/healer/exceptions-manager.tsx",
  "components/healer/booking-rules-form.tsx",
  "app/healer/(portal)/sessions/page.tsx",
  "app/healer/(portal)/profile/page.tsx",
  "app/healer/(portal)/settings/page.tsx",
  // pass 4 — admin
  "app/admin/(portal)/analytics/page.tsx",
  "app/admin/(portal)/analytics/detail/page.tsx",
  "app/admin/(portal)/blog/page.tsx",
  "app/admin/(portal)/blog/new/page.tsx",
  "app/admin/(portal)/blog/[id]/page.tsx",
  "app/admin/(portal)/audit/page.tsx",
  "app/admin/(portal)/settings/page.tsx",
  "lib/actions/articles.ts",
  "components/admin/markdown-editor.tsx",
  "lib/content/article.ts",
  "lib/services/article-adapter.ts",
  // pass 5
  ".gitignore",
  "scripts/check-migrations.mjs",
  "scripts/audit-routes.mjs",
  "app/api/analytics/collect/route.ts",
  "components/analytics/tracker.tsx",
  "app/admin/(portal)/users/page.tsx",
  "lib/services/users.ts",
  "lib/actions/users.ts",
  // pass 6
  "supabase/migrations/20260809001400_practices_fields.sql",
  "lib/content/practice.ts",
  "lib/services/practices.ts",
  "lib/services/practice-adapter.ts",
  "lib/actions/practices.ts",
  "app/admin/(portal)/practices/page.tsx",
  "app/admin/(portal)/practices/new/page.tsx",
  "app/admin/(portal)/practices/[id]/page.tsx",
  "lib/services/email.ts",
  "lib/services/notifications.ts",
  "lib/services/tabular-read.ts",
  "lib/services/imports.ts",
  "lib/actions/imports.ts",
  "app/api/admin/import/route.ts",
  "app/admin/(portal)/healers/import/page.tsx",
  "app/admin/(portal)/blog/import/page.tsx",
  "lib/services/pdf.ts",
];
for (const rel of REQUIRED) {
  if (!existsSync(join(root, rel))) problems.push(`MISSING REQUIRED FILE: ${rel}`);
}

// Any Next.js route group under app/ that contains pages needs a layout only
// if it is meant to have one; assert the admin portal specifically, since its
// layout is the auth gate.
for (const group of ["app/admin/(portal)", "app/healer/(portal)"]) {
  if (existsSync(join(root, group)) && !existsSync(join(root, group + "/layout.tsx"))) {
    problems.push(group + " has no layout.tsx — the portal would render unguarded");
  }
}

// ------------------------------------------------------------------ output --
if (problems.length === 0) {
  console.log(`check: OK — ${files.length} modules, no integrity problems found.`);
  console.log("NOTE: this is not a type check. Run `npm run typecheck` where npm works.");
  process.exit(0);
}
console.log(`check: ${problems.length} problem(s) across ${files.length} modules\n`);
for (const p of problems) console.log("  " + p);
console.log("\nNOTE: this is not a type check. Run `npm run typecheck` where npm works.");
process.exit(1);
