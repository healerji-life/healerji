/**
 * Migration-checker rule tests.
 *
 * The rule under test: a table created after the blanket RLS migration is a
 * problem *unless* the same migration enables RLS on it. The checker used to
 * flag both cases, which made the gate permanently red for a table that was
 * fully protected.
 *
 * Fixtures are written to a temp directory and the real script is run against
 * them via MIGRATIONS_DIR, so this exercises the shipped code path rather than
 * a reimplementation of it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A minimal but valid-enough migration set: extensions, a table, then RLS. */
const BASE_FILES: Record<string, string> = {
  "20260101000100_extensions.sql": `
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "btree_gist" with schema extensions;
`,
  "20260101000200_core.sql": `
create table if not exists public.widgets (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
`,
  "20260101000300_rls_policies.sql": `
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_class c where c.relrowsecurity = false) then
    raise exception 'a public table has no RLS';
  end if;
end $$;
`,
};

function runChecker(extra: Record<string, string>): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "healerji-mig-"));
  try {
    for (const [name, body] of Object.entries({ ...BASE_FILES, ...extra })) {
      writeFileSync(join(dir, name), body);
    }
    try {
      const out = execFileSync("node", ["scripts/check-migrations.mjs"], {
        env: { ...process.env, MIGRATIONS_DIR: dir },
        encoding: "utf8",
      });
      return { code: 0, out };
    } catch (error) {
      const e = error as { status?: number; stdout?: string; stderr?: string };
      return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("passes when a later migration enables RLS on the table it creates", () => {
  const { code, out } = runChecker({
    "20260102000100_late_safe.sql": `
create table if not exists public.late_safe (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

alter table public.late_safe enable row level security;

drop policy if exists late_safe_read on public.late_safe;
create policy late_safe_read on public.late_safe
  for select to anon, authenticated using (true);
`,
  });
  assert.equal(code, 0, `expected clean exit, got:\n${out}`);
  assert.ok(!out.includes("late_safe"), `late_safe should not be flagged:\n${out}`);
});

test("still flags a later migration that creates a table without enabling RLS", () => {
  const { code, out } = runChecker({
    "20260102000100_late_unsafe.sql": `
create table if not exists public.late_unsafe (
  id uuid primary key default gen_random_uuid(),
  secret text not null
);
`,
  });
  assert.notEqual(code, 0, `expected failure, got clean exit:\n${out}`);
  assert.ok(out.includes("late_unsafe"), `late_unsafe should be flagged:\n${out}`);
  assert.ok(
    out.includes("never enables RLS"),
    `expected the RLS-ordering message, got:\n${out}`
  );
});

test("flags the unsafe table even when a sibling table in the same file is safe", () => {
  const { code, out } = runChecker({
    "20260102000100_late_mixed.sql": `
create table if not exists public.late_ok (id uuid primary key);
alter table public.late_ok enable row level security;

create table if not exists public.late_forgotten (id uuid primary key);
`,
  });
  assert.notEqual(code, 0, `expected failure, got clean exit:\n${out}`);
  assert.ok(out.includes("late_forgotten"), `late_forgotten should be flagged:\n${out}`);
  assert.ok(!out.includes('"public.late_ok"'), `late_ok should not be flagged:\n${out}`);
});

test("the real migration set passes", () => {
  const out = execFileSync("node", ["scripts/check-migrations.mjs"], { encoding: "utf8" });
  assert.ok(out.includes("check:migrations OK"), `expected OK, got:\n${out}`);
});
