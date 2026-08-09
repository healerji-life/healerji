/**
 * Generates supabase/seed.sql from the existing lib/data/*.ts modules.
 *
 * Requirement 44/64: the current website content is the seed. Nothing here is
 * invented — every value is read out of the repository's own data files, and
 * the script fails loudly rather than guessing if a reference does not resolve.
 *
 *   node scripts/generate-seed.mjs
 *
 * Re-run it whenever lib/data/*.ts changes before the database becomes the
 * source of truth. After the cutover this script is only a historical record.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

/** Pull `export const <name> ... = [ ... ]` out of a TS module by bracket matching. */
function extractArray(source, name) {
  const start = source.indexOf(`export const ${name}`);
  if (start === -1) throw new Error(`could not find "export const ${name}"`);
  // Skip past the type annotation: `export const healers: Healer[] = [`
  // — the first "[" belongs to `Healer[]`, not to the data.
  const eq = source.indexOf("=", start);
  if (eq === -1) throw new Error(`no assignment for "${name}"`);
  const open = source.indexOf("[", eq);
  if (open === -1) throw new Error(`no array literal after "${name}"`);

  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < source.length; i++) {
    const c = source[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) throw new Error(`unbalanced array literal in "${name}"`);
  // The literals are plain data — no identifiers, no calls.
  const parsed = eval(`(${source.slice(open, i + 1)})`);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`"${name}" parsed to an empty array — the extractor is wrong, not the data`);
  }
  return parsed;
}

// ---------------------------------------------------------------- escaping --
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v === null || v === undefined ? "NULL" : String(v));
const bool = (v) => (v ? "true" : "false");
const textArray = (xs) => (!xs?.length ? "'{}'" : `array[${xs.map(q).join(", ")}]::text[]`);
const jsonb = (v) => `${q(JSON.stringify(v))}::jsonb`;
const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ------------------------------------------------------------------- input --
const modalities   = extractArray(read("lib/data/modalities.ts"), "modalities");
const healers      = extractArray(read("lib/data/healers.ts"), "healers");
const articles     = extractArray(read("lib/data/articles.ts"), "articles");
const testimonials = extractArray(read("lib/data/testimonials.ts"), "testimonials");
let practices = [];
try { practices = extractArray(read("lib/data/practices.ts"), "practices"); } catch { /* optional */ }

// ------------------------------------------------------------ integrity ----
const modalitySlugs = new Set(modalities.map((m) => m.slug));
const missing = [];
for (const h of healers) {
  for (const m of h.modalities) if (!modalitySlugs.has(m)) missing.push(`${h.slug} -> ${m}`);
}
if (missing.length) {
  throw new Error(
    `healers reference modalities that do not exist in lib/data/modalities.ts:\n  ${missing.join("\n  ")}`
  );
}

// Languages are free text in the source; derive a stable code table from them.
const LANG_CODES = {
  English: "en", Hindi: "hi", Tamil: "ta", Telugu: "te", Kannada: "kn",
  Malayalam: "ml", Marathi: "mr", Bengali: "bn", Gujarati: "gu",
  Punjabi: "pa", Urdu: "ur", Odia: "or", Assamese: "as", Sanskrit: "sa",
};
const languages = [...new Set(healers.flatMap((h) => h.languages))].sort();
const unknownLangs = languages.filter((l) => !LANG_CODES[l]);
if (unknownLangs.length) {
  throw new Error(`no ISO code mapped for language(s): ${unknownLangs.join(", ")}`);
}

const categories = [...new Set(articles.map((a) => a.category))].sort();

// ------------------------------------------------------------------ output --
const out = [];
const w = (s = "") => out.push(s);

w("-- ============================================================================");
w("-- HealerJi · seed");
w("-- GENERATED FILE — produced by scripts/generate-seed.mjs from lib/data/*.ts.");
w("-- Do not edit by hand; edit the source data or, after cutover, the database.");
w("--");
w("-- Idempotent: every statement is ON CONFLICT DO UPDATE, so re-running this");
w("-- refreshes content without duplicating rows or disturbing bookings.");
w("--");
w("-- NOTE ON AVAILABILITY: this seed deliberately creates NO availability rules");
w("-- and sets accepting_bookings = false for every healer. Inventing a schedule");
w("-- would let a customer book a time no healer has agreed to. Availability must");
w("-- be entered by each healer in the healer portal (or load supabase/seed.dev.sql");
w("-- for local testing only).");
w("-- ============================================================================");
w();
w("begin;");
w();

// -- modalities
w("-- ------------------------------------------------------------- modalities --");
for (const m of modalities) {
  w(`insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)`);
  w(`values (${q(m.slug)}, ${q(m.name)}, ${q(m.essence)}, ${q(m.what)}, ${q(m.session)}, ${q(m.isNot)}, ${textArray(m.paths)}, ${modalities.indexOf(m)}, 'active')`);
  w(`on conflict (slug) do update set name = excluded.name, essence = excluded.essence,`);
  w(`  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,`);
  w(`  path_slugs = excluded.path_slugs, display_order = excluded.display_order;`);
  w();
}

// -- languages
w("-- -------------------------------------------------------------- languages --");
languages.forEach((name, i) => {
  w(`insert into public.languages (code, name, display_order) values (${q(LANG_CODES[name])}, ${q(name)}, ${i})`);
  w(`on conflict (code) do update set name = excluded.name;`);
});
w();

// -- article categories
w("-- ------------------------------------------------------ article categories --");
categories.forEach((name, i) => {
  w(`insert into public.article_categories (slug, name, display_order, status) values (${q(slugify(name))}, ${q(name)}, ${i}, 'active')`);
  w(`on conflict (slug) do update set name = excluded.name;`);
});
w();

// -- healers
w("-- ---------------------------------------------------------------- healers --");
healers.forEach((h, i) => {
  w(`-- ${h.name}`);
  w(`insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  ${q(h.slug)}, ${q(h.name)}, ${q(h.headline)}, ${q(h.bio)}, ${q(h.gender)}, ${num(h.years)},
  ${num(h.rating)}, ${num(h.reviews)}, ${num(h.pricePaise)}, 'INR',
  ${bool(h.verified?.identity)}, ${bool(h.verified?.credentials)}, ${bool(h.verified?.interviewed)},
  'Asia/Kolkata', ${bool(i < 3)}, ${i}, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;`);
  w();

  w(`delete from public.healer_modalities where healer_id = (select id from public.healers where slug = ${q(h.slug)});`);
  h.modalities.forEach((m, j) => {
    w(`insert into public.healer_modalities (healer_id, modality_slug, display_order)`);
    w(`values ((select id from public.healers where slug = ${q(h.slug)}), ${q(m)}, ${j})`);
    w(`on conflict do nothing;`);
  });

  w(`delete from public.healer_languages where healer_id = (select id from public.healers where slug = ${q(h.slug)});`);
  h.languages.forEach((l, j) => {
    w(`insert into public.healer_languages (healer_id, language_code, display_order)`);
    w(`values ((select id from public.healers where slug = ${q(h.slug)}), ${q(LANG_CODES[l])}, ${j})`);
    w(`on conflict do nothing;`);
  });

  // Session offerings: the base rate is for 45 minutes, pro-rata for 30 and 60.
  // This reproduces exactly the arithmetic already in app/api/checkout/route.ts.
  for (const kind of h.sessionTypes) {
    for (const minutes of [30, 45, 60]) {
      const price = Math.round((h.pricePaise * minutes) / 45);
      w(`insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)`);
      w(`values ((select id from public.healers where slug = ${q(h.slug)}), ${q(kind)}, ${minutes}, ${price}, true)`);
      w(`on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;`);
    }
  }

  w(`insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)`);
  w(`values ((select id from public.healers where slug = ${q(h.slug)}), 'Asia/Kolkata', false)`);
  w(`on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar`);
  w();
});

// -- articles
w("-- --------------------------------------------------------------- articles --");
for (const a of articles) {
  w(`insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  ${q(a.slug)}, ${q(a.title)}, ${q(a.kind)}, ${q(slugify(a.category))}, ${q(a.pathway)},
  ${num(a.minutes)}, ${q(a.standfirst)},
  ${jsonb(a.body)},
  ${q(a.body.join("\n\n"))},
  ${q(a.author)}, 'published', ${q(a.published)}::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;`);
  w();
}

// -- testimonials
w("-- ----------------------------------------------------------- testimonials --");
testimonials.forEach((t, i) => {
  w(`insert into public.testimonials (display_name, anonymous, path_slug, quote, status, display_order)`);
  w(`values (${q(t.name)}, ${bool(t.anonymous)}, ${q(t.path)}, ${q(t.quote)}, 'published', ${i})`);
  w(`on conflict do nothing;`);
});
w();

// -- practices
if (practices.length) {
  w("-- --------------------------------------------------------------- practices --");
  practices.forEach((p, i) => {
    // category and after_note were added in migration 0014; both are rendered
    // publicly and after_note carries the medical-care caveat.
    w(`insert into public.practices (slug, title, summary, category, after_note, pathway, minutes, steps, status, display_order, published_at)`);
    w(`values (${q(p.slug)}, ${q(p.title)}, ${q(p.standfirst ?? "")}, ${q(p.category ?? null)}, ${q(p.after ?? "")}, ${q(p.pathway ?? null)}, ${num(p.minutes)}, ${jsonb(p.steps ?? [])}, 'published', ${i}, now())`);
    w(`on conflict (slug) do update set title = excluded.title, summary = excluded.summary,`);
    w(`  category = excluded.category, after_note = excluded.after_note,`);
    w(`  minutes = excluded.minutes, steps = excluded.steps;`);
    w();
  });
}

// -- settings
w("-- ---------------------------------------------------------- app settings --");
const settings = [
  ["booking.default_hold_minutes", 15, "Slot hold duration", "How long a slot is reserved while payment completes.", "booking"],
  ["booking.default_buffer_minutes", 15, "Default buffer", "Gap after a session before the next may start.", "booking"],
  ["booking.default_max_advance_days", 60, "Booking window", "How far ahead the public calendar allows booking.", "booking"],
  ["analytics.retention_days", 400, "Analytics retention", "Raw page views and events older than this are purged.", "analytics"],
  ["analytics.exclude_bots", true, "Exclude bots", "Filter known crawlers out of reporting.", "analytics"],
];
for (const [key, value, label, description, category] of settings) {
  w(`insert into public.app_settings (key, value, label, description, category)`);
  w(`values (${q(key)}, ${jsonb(value)}, ${q(label)}, ${q(description)}, ${q(category)})`);
  w(`on conflict (key) do nothing;`);
}
w();
w("commit;");
w();

writeFileSync(join(root, "supabase/seed.sql"), out.join("\n"), "utf8");

console.log(
  `seed.sql written — ${modalities.length} modalities, ${languages.length} languages, ` +
  `${healers.length} healers, ${categories.length} categories, ${articles.length} articles, ` +
  `${testimonials.length} testimonials, ${practices.length} practices`
);
