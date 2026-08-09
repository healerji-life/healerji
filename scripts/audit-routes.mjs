/**
 * Route tree and secret audit.
 *
 * Enumerates every route in app/ and reports, per route: whether it is guarded,
 * which service layer it uses, and whether it has loading / error / empty
 * handling. Also scans the whole repository for committed secrets.
 *
 * Run: npm run audit
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const root = process.cwd();

// ------------------------------------------------------------- route tree ----
const routes = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!/^(page|route)\.tsx?$/.test(entry.name)) continue;

    const rel = relative(root, p);
    const src = readFileSync(p, "utf8");

    // URL path: drop app/, the filename, and any (group) segments.
    const urlPath =
      "/" +
      dirname(rel)
        .replace(/^app\/?/, "")
        .split("/")
        .filter((seg) => seg && !/^\(.*\)$/.test(seg))
        .join("/");

    const isApi = rel.includes("app/api/");
    const guarded = /require(Staff|Admin|Permission|Healer|Viewer|HealerActor)|authorise\(/.test(src);
    const dirOf = dirname(p);

    routes.push({
      rel,
      url: urlPath === "/" ? "/" : urlPath.replace(/\/$/, ""),
      kind: isApi ? "api" : "page",
      guarded,
      dynamic: /export const dynamic/.test(src),
      revalidate: /export const revalidate/.test(src),
      usesService: /@\/lib\/services\//.test(src),
      usesLegacyData: /@\/lib\/data\/(healers|articles|practices)/.test(src),
      hasLoading: existsSync(join(dirOf, "loading.tsx")) || inheritsFile(dirOf, "loading.tsx"),
      hasError: existsSync(join(dirOf, "error.tsx")) || inheritsFile(dirOf, "error.tsx"),
      hasEmpty: /EmptyState|No .* yet|length === 0|isEmpty/.test(src),
      hasErrorBranch: /\.ok \?|!result\.ok|ErrorState|role="alert"/.test(src),
    });
  }
})(join(root, "app"));

/** Walks up to app/ looking for an inherited loading.tsx / error.tsx. */
function inheritsFile(dir, filename) {
  let current = dir;
  const stop = join(root, "app");
  while (current.startsWith(stop)) {
    if (existsSync(join(current, filename))) return true;
    if (current === stop) break;
    current = dirname(current);
  }
  return false;
}

const pages = routes.filter((r) => r.kind === "page").sort((a, b) => a.url.localeCompare(b.url));
const apis = routes.filter((r) => r.kind === "api").sort((a, b) => a.url.localeCompare(b.url));

/**
 * Zone by first path SEGMENT, not by prefix.
 *
 * startsWith("/healer") wrongly claimed the PUBLIC healer directory /healers
 * as part of the healer portal, and reported it as an unguarded private route.
 * Segment matching is the correct test.
 */
const zone = (url) => {
  const first = url.split("/").filter(Boolean)[0];
  if (first === "admin") return "admin";
  if (first === "healer") return "healer";
  return "public";
};

/**
 * Routes inside a private zone that are public BY DESIGN, with the reason.
 * Anything not listed here and not guarded is a real finding.
 */
const INTENTIONALLY_PUBLIC = new Map([
  ["/admin/login", "sign-in form — must be reachable while signed out"],
  ["/healer/login", "sign-in form — must be reachable while signed out"],
  ["/admin", "redirect-only stub to /admin/dashboard, which is guarded"],
  ["/healer", "redirect-only stub to /healer/dashboard, which is guarded"],
]);

/**
 * Server actions that are unauthenticated by definition: they ARE the
 * authentication surface. Each is rate-limited by Supabase Auth and returns
 * deliberately identical errors for unknown-account and wrong-password.
 */
const AUTH_SURFACE = new Set([
  "signIn", "signUp", "requestPasswordReset", "updatePassword", "signOut", "signInWithGoogle",
]);

console.log("=".repeat(78));
console.log("ROUTE TREE");
console.log("=".repeat(78));

for (const group of ["public", "admin", "healer"]) {
  const list = pages.filter((r) => zone(r.url) === group);
  if (list.length === 0) continue;
  console.log(`\n${group.toUpperCase()} PAGES (${list.length})`);
  console.log("  route".padEnd(40) + "guard  svc  load  err  empty");
  for (const r of list) {
    const exempt = INTENTIONALLY_PUBLIC.has(r.url);
    const needsGuard = group !== "public" && !exempt;
    const guardMark = exempt ? " pub " : needsGuard ? (r.guarded ? " ok  " : " !!  ") : "  -  ";
    console.log(
      "  " + r.url.padEnd(38) +
      guardMark +
      (r.usesService ? " y " : " - ") + "  " +
      (r.hasLoading ? " y " : " - ") + "  " +
      (r.hasError ? " y " : " - ") + "  " +
      (r.hasEmpty || r.hasErrorBranch ? " y " : " - ")
    );
  }
}

console.log(`\nAPI ROUTES (${apis.length})`);
console.log("  route".padEnd(40) + "guard");
for (const r of apis) {
  // Public-by-design endpoints are annotated in-file; list guard state plainly.
  console.log("  " + r.url.padEnd(38) + (r.guarded ? " authorised" : " public//self-guarded"));
}

// ------------------------------------------------------- server actions ----
const actionFiles = [];
(function walkLib(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { walkLib(p); continue; }
    if (!/\.ts$/.test(entry.name)) continue;
    const src = readFileSync(p, "utf8");
    if (!/^\s*["']use server["']/m.test(src)) continue;
    const exported = [...src.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1]);
    const authorised = [...src.matchAll(/export\s+async\s+function\s+(\w+)[\s\S]*?(?=export\s+async\s+function|\s*$)/g)]
      .filter((m) => /authorise\(|requireHealerActor\(|auth\.getUser\(/.test(m[0]))
      .map((m) => m[1]);
    actionFiles.push({ rel: relative(root, p), exported, authorised });
  }
})(join(root, "lib"));

console.log("\n" + "=".repeat(78));
console.log("SERVER ACTIONS");
console.log("=".repeat(78));
let unauthorised = 0;
for (const f of actionFiles) {
  console.log(`\n  ${f.rel}`);
  for (const fn of f.exported) {
    const ok = f.authorised.includes(fn) || AUTH_SURFACE.has(fn);
    if (!ok) unauthorised++;
    const note = AUTH_SURFACE.has(fn) ? "  (auth surface — unauthenticated by design)" : "";
    console.log(`    ${ok ? "ok  " : "!!  "}${fn}${note}`);
  }
}

// ---------------------------------------------------------- secret scan ----
const SECRET_PATTERNS = [
  { name: "Supabase service_role JWT", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Razorpay key id", re: /rzp_(live|test)_[A-Za-z0-9]{10,}/ },
  { name: "Razorpay/Cloudinary secret-looking", re: /(api_secret|key_secret)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i },
  { name: "Resend key", re: /re_[A-Za-z0-9]{16,}/ },
  { name: "Google OAuth secret", re: /GOCSPX-[A-Za-z0-9_\-]{10,}/ },
  { name: "Generic private key", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "Cloudinary URL with secret", re: /cloudinary:\/\/\d+:[A-Za-z0-9_\-]+@/ },
];

const findings = [];
(function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next"].includes(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { scan(p); continue; }
    if (!/\.(ts|tsx|js|jsx|mjs|json|sql|md|env|example|yml|yaml|toml)$/.test(entry.name) &&
        entry.name !== ".env.example") continue;
    if (statSync(p).size > 2_000_000) continue;
    const src = readFileSync(p, "utf8");
    for (const { name, re } of SECRET_PATTERNS) {
      const m = re.exec(src);
      if (m) findings.push({ file: relative(root, p), name, sample: m[0].slice(0, 12) + "…" });
    }
  }
})(root);

console.log("\n" + "=".repeat(78));
console.log("SECRET SCAN");
console.log("=".repeat(78));
if (findings.length === 0) {
  console.log("  no committed secrets found across source, SQL, config and docs");
} else {
  for (const f of findings) console.log(`  !! ${f.file}: ${f.name} (${f.sample})`);
}

// ------------------------------------------------------ .env / gitignore ----
console.log("\n" + "=".repeat(78));
console.log("VERCEL / GIT READINESS");
console.log("=".repeat(78));
const gitignore = existsSync(join(root, ".gitignore"))
  ? readFileSync(join(root, ".gitignore"), "utf8")
  : "";
// Leading "/" is idiomatic in .gitignore (anchors to repo root), so the
// patterns must tolerate it — an earlier version did not and reported a
// false negative on a correct file.
const ignoreChecks = [
  [".env", /^\/?\.env\b/m],
  ["node_modules", /^\/?node_modules/m],
  [".next", /^\/?\.next/m],
];
if (!gitignore) {
  console.log("  !! no .gitignore present");
} else {
  for (const [label, re] of ignoreChecks) {
    console.log(`  ${re.test(gitignore) ? "ok  " : "!!  "}${label} ignored`);
  }
}
for (const f of [".env", ".env.local", ".env.production"]) {
  if (existsSync(join(root, f))) console.log(`  !! ${f} exists in the repo — must not be committed`);
}
console.log(`  ${existsSync(join(root, ".env.example")) ? "ok  " : "!!  "}.env.example present`);

// Env vars referenced in code vs documented in .env.example
const referenced = new Set();
(function scanEnv(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next"].includes(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { scanEnv(p); continue; }
    if (!/\.(ts|tsx|mjs)$/.test(entry.name)) continue;
    for (const m of readFileSync(p, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      referenced.add(m[1]);
    }
  }
})(root);

const example = existsSync(join(root, ".env.example"))
  ? readFileSync(join(root, ".env.example"), "utf8")
  : "";
const undocumented = [...referenced].filter((v) => !example.includes(v)).sort();
if (undocumented.length) {
  console.log(`  !! referenced in code but missing from .env.example: ${undocumented.join(", ")}`);
} else {
  console.log("  ok  every env var referenced in code is documented in .env.example");
}

const publicSecrets = [...referenced].filter(
  (v) => v.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD/i.test(v)
);
console.log(
  publicSecrets.length
    ? `  !! NEXT_PUBLIC_ vars that look secret: ${publicSecrets.join(", ")}`
    : "  ok  no NEXT_PUBLIC_ variable looks like a secret"
);

console.log("\nintentionally public inside a private zone:");
for (const [url, why] of INTENTIONALLY_PUBLIC) console.log(`  ${url.padEnd(20)} ${why}`);

console.log("\n" + "=".repeat(78));
const failures =
  pages.filter(
    (r) => zone(r.url) !== "public" && !r.guarded && !INTENTIONALLY_PUBLIC.has(r.url)
  ).length +
  findings.length + unauthorised +
  (existsSync(join(root, ".gitignore")) ? 0 : 1);
console.log(
  failures === 0
    ? "AUDIT OK — no unguarded private routes, no unauthorised actions, no committed secrets"
    : `AUDIT: ${failures} issue(s) above`
);
console.log("NOTE: static audit. Does not prove runtime behaviour.");
process.exit(failures === 0 ? 0 : 1);
