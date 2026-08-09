/**
 * Migration consistency analyzer.
 *
 * The migrations have never been applied to a database, so this simulates the
 * parts of `supabase db push` that can be checked without Postgres:
 * declaration order, unmet dependencies, duplicate object names, and references
 * to things that are never created.
 *
 * It is NOT a Postgres parser and does not prove the SQL is valid. It catches
 * the class of error that only shows up when applying files sequentially to a
 * FRESH database — which is exactly the situation nobody has tested.
 *
 * Run: npm run check:migrations
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

const problems = [];
const warnings = [];

// What exists so far, as we walk the files in order.
const created = {
  extensions: new Set(),
  types: new Set(),
  tables: new Set(),
  views: new Set(),
  functions: new Set(),
  policies: new Set(),   // "table:policy"
  triggers: new Set(),   // "table:trigger"
  indexes: new Set(),
};

/** Strip comments and string/dollar-quoted literals so patterns don't match inside them. */
function stripLiterals(sql) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    // line comment
    if (sql.startsWith("--", i)) {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl;
      continue;
    }
    // dollar-quoted block
    const dq = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
    if (dq) {
      const tag = dq[0];
      const end = sql.indexOf(tag, i + tag.length);
      if (end === -1) { i = sql.length; continue; }
      // Keep the body (function bodies contain real DDL we want to see) but
      // strip ITS comments too — otherwise a line like
      // "-- SECURITY DEFINER bypasses RLS" inside a body is counted as a
      // declaration. This was a real false-positive source.
      out += stripLiterals(sql.slice(i + tag.length, end));
      i = end + tag.length;
      continue;
    }
    // single-quoted literal
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") break;
        j++;
      }
      out += " ";
      i = j + 1;
      continue;
    }
    out += sql[i];
    i++;
  }
  return out;
}

const norm = (name) => name.replace(/^public\./i, "").replace(/"/g, "").toLowerCase();

for (const file of files) {
  const raw = readFileSync(join(DIR, file), "utf8");
  const sql = stripLiterals(raw);
  const where = (msg) => `${file}: ${msg}`;

  // ---------------------------------------------------------- creations ----
  for (const m of sql.matchAll(/create\s+extension\s+(?:if\s+not\s+exists\s+)?"?([a-z_]+)"?/gi)) {
    created.extensions.add(m[1].toLowerCase());
  }
  for (const m of sql.matchAll(/create\s+type\s+([\w.]+)\s+as\s+(?:enum|range)/gi)) {
    created.types.add(norm(m[1]));
  }
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi)) {
    created.tables.add(norm(m[1]));
  }
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+([\w.]+)/gi)) {
    created.views.add(norm(m[1]));
  }
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\(/gi)) {
    created.functions.add(norm(m[1]));
  }
  for (const m of sql.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi)) {
    const name = norm(m[1]);
    if (created.indexes.has(name)) {
      problems.push(where(`duplicate index name "${name}" — the second CREATE INDEX will fail`));
    }
    created.indexes.add(name);
  }

  // -------------------------------------------------------- dependencies ----
  // Tables referenced by foreign keys must already exist.
  for (const m of sql.matchAll(/references\s+((?:auth\.|public\.)?[\w.]+)\s*\(/gi)) {
    const target = m[1].toLowerCase();
    if (target.startsWith("auth.")) continue;            // Supabase-managed
    if (!created.tables.has(norm(target))) {
      problems.push(where(`foreign key references "${target}" which has not been created yet`));
    }
  }

  // Enum types used in column definitions must already exist.
  for (const m of sql.matchAll(/\b(?:public\.)?(app_role|record_status|content_status|article_kind|session_kind|booking_status|booking_payment_status|payment_state|refund_state|profile_status|auth_provider|availability_exception_kind|application_status|timerange)\b/gi)) {
    const t = m[1].toLowerCase();
    if (!created.types.has(t)) {
      problems.push(where(`uses type "${t}" before it is created`));
    }
  }

  // Functions called in policies/constraints must already exist.
  for (const m of sql.matchAll(/\bpublic\.(has_role|is_admin|is_staff|is_super_admin|current_healer_id|set_updated_at|generate_booking_reference|resolve_session_price|get_available_slots)\s*\(/gi)) {
    const fn = m[1].toLowerCase();
    if (!created.functions.has(fn)) {
      problems.push(where(`calls public.${fn}() before it is defined`));
    }
  }

  // ------------------------------------------------------------- policies ----
  for (const m of sql.matchAll(/create\s+policy\s+([\w"]+)\s+on\s+([\w.]+)/gi)) {
    const key = `${norm(m[2])}:${norm(m[1])}`;
    const dropped = new RegExp(
      `drop\\s+policy\\s+if\\s+exists\\s+${m[1].replace(/"/g, "")}\\s+on\\s+${m[2].replace(/public\./i, "(public\\.)?")}`,
      "i"
    ).test(sql);
    if (created.policies.has(key) && !dropped) {
      problems.push(where(`duplicate policy "${norm(m[1])}" on ${norm(m[2])} with no DROP first`));
    }
    if (!created.tables.has(norm(m[2])) && !created.views.has(norm(m[2]))) {
      problems.push(where(`policy on "${norm(m[2])}" which does not exist yet`));
    }
    created.policies.add(key);
  }

  // ------------------------------------------------------------- triggers ----
  for (const m of sql.matchAll(/create\s+trigger\s+([\w"]+)[\s\S]{0,200}?\son\s+((?:auth\.|public\.)?[\w.]+)/gi)) {
    const table = m[2].toLowerCase();
    if (table.startsWith("auth.")) continue;
    if (!created.tables.has(norm(table))) {
      problems.push(where(`trigger "${norm(m[1])}" on "${table}" which does not exist yet`));
    }
    const key = `${norm(table)}:${norm(m[1])}`;
    const dropped = new RegExp(`drop\\s+trigger\\s+if\\s+exists\\s+${m[1].replace(/"/g, "")}\\s`, "i").test(sql);
    if (created.triggers.has(key) && !dropped) {
      problems.push(where(`duplicate trigger "${norm(m[1])}" on ${norm(table)} with no DROP first`));
    }
    created.triggers.add(key);
  }

  // ------------------------------------------------- extension dependencies ----
  if (/exclude\s+using\s+gist[\s\S]{0,200}?with\s+=/i.test(sql) && !created.extensions.has("btree_gist")) {
    problems.push(where("EXCLUDE USING gist with an equality operator needs btree_gist, not yet created"));
  }
  if (/\bcitext\b/i.test(sql) && !created.extensions.has("citext")) {
    problems.push(where("uses citext before the extension is created"));
  }
  if (/gen_random_uuid\s*\(/i.test(sql) && !created.extensions.has("pgcrypto")) {
    warnings.push(where("uses gen_random_uuid() — provided by pgcrypto; fine on PG13+ core, but pgcrypto is not yet created"));
  }

  // ------------------------------------------------------------ hygiene ----
  /**
   * Per-definition SECURITY DEFINER check.
   *
   * Each definition is sliced from its own CREATE up to the next CREATE FUNCTION
   * (or end of file). Bounding by the dollar-quote tag does not work here,
   * because stripLiterals() has already consumed those tags — an earlier version
   * of this check did that and produced a false positive by reading into the
   * *next* function's header.
   */
  {
    const headers = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\(/gi)];
    headers.forEach((m, idx) => {
      const from = m.index ?? 0;
      const to = idx + 1 < headers.length ? (headers[idx + 1].index ?? sql.length) : sql.length;
      const definition = sql.slice(from, to);
      if (/security\s+definer/i.test(definition) && !/set\s+search_path\s*=/i.test(definition)) {
        problems.push(where(`SECURITY DEFINER function ${norm(m[1])}() does not pin search_path — hijackable`));
      }
    });
  }

  if (/\bdrop\s+table\b/i.test(sql) && !/if\s+exists/i.test(sql)) {
    warnings.push(where("contains DROP TABLE — verify this is intended on a fresh database"));
  }
}

// -------------------------------------------------- cross-file consistency ----
// Every table with RLS-relevant data should have RLS enabled somewhere.
const rlsFile = files.find((f) => f.includes("rls_policies"));
if (rlsFile) {
  // Read RAW here, not stripped: the blanket enable is issued via
  // `execute format('alter table public.%I enable row level security', ...)`,
  // and that DDL lives inside a string literal the stripper blanks out.
  const rlsRaw = readFileSync(join(DIR, rlsFile), "utf8");
  const rls = stripLiterals(rlsRaw);
  const enablesAll = /pg_tables[\s\S]{0,400}?enable\s+row\s+level\s+security/i.test(rlsRaw);

  // The migration also self-asserts: it raises if any public table lacks RLS.
  const selfChecks = /relrowsecurity\s*=\s*false[\s\S]{0,300}?raise\s+exception/i.test(rlsRaw);
  if (!enablesAll && !selfChecks) {
    problems.push(`${rlsFile}: no blanket RLS enable and no self-check`);
  }
  if (!enablesAll) {
    for (const table of created.tables) {
      if (!new RegExp(`alter\\s+table\\s+(public\\.)?${table}\\s+enable\\s+row\\s+level`, "i").test(rls)) {
        problems.push(`${rlsFile}: RLS never enabled on "${table}"`);
      }
    }
  }
} else {
  problems.push("no RLS migration found");
}

// Tables created AFTER the RLS migration would miss the blanket enable.
const rlsIndex = files.indexOf(rlsFile);
if (rlsIndex >= 0) {
  for (let i = rlsIndex + 1; i < files.length; i++) {
    const later = stripLiterals(readFileSync(join(DIR, files[i]), "utf8"));
    for (const m of later.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi)) {
      problems.push(
        `${files[i]}: creates table "${norm(m[1])}" AFTER the RLS migration — it will have no RLS. Move it earlier or enable RLS explicitly.`
      );
    }
  }
}

// ------------------------------------------------------------------ report ----
console.log(`migrations: ${files.length} files\n`);
console.log("objects declared:");
console.log(`  extensions ${created.extensions.size}  types ${created.types.size}  tables ${created.tables.size}`);
console.log(`  views ${created.views.size}  functions ${created.functions.size}  policies ${created.policies.size}  triggers ${created.triggers.size}\n`);

if (warnings.length) {
  console.log(`${warnings.length} warning(s):`);
  for (const w of warnings) console.log("  ~ " + w);
  console.log("");
}

if (problems.length === 0) {
  console.log("check:migrations OK — no ordering or dependency problems found.");
  console.log("NOTE: this is not a Postgres parser. It does not prove the SQL executes.");
  process.exit(0);
}
console.log(`${problems.length} problem(s):`);
for (const p of problems) console.log("  ! " + p);
console.log("\nNOTE: this is not a Postgres parser. It does not prove the SQL executes.");
process.exit(1);
