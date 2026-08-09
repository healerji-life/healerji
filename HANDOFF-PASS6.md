# HealerJi — pass 6

Status vocabulary, used strictly below:
**VERIFIED** = executed and observed · **NOT VERIFIED — reason** · **BLOCKED — blocker**

---

# 1. IMPLEMENTED

## Guided Practices CMS + public cutover (Phase 4)

`/admin/practices`, `/new`, `/[id]` — create, edit, publish, unpublish, schedule,
archive, search, filter, quick actions from the list.

The existing schema was **extended, not replaced**. Migration `0014` adds the two
fields the public site actually renders and the table lacked:
* `category` — the pill on the card, with a CHECK constraint over the five known values
* `after_note` — the closing note, which carries the *"please also speak to a doctor"*
  caveat. That is a safety message, so the editor warns before publishing a
  practice without one.

A dedicated `StepEditor` handles pacing: each step has its own duration, steps
reorder, and **the card length is derived from the steps** — an editor cannot
claim nine minutes for a three-minute practice.

**All five public consumers migrated.** `lib/data/practices.ts` now has **zero data
consumers** (verified by grep). Combined with passes 4–5, no static file is a
source of truth any more:

| Legacy module | Data consumers |
|---|---|
| `lib/data/healers.ts` | **0** |
| `lib/data/articles.ts` | **0** |
| `lib/data/practices.ts` | **0** |

All three remain as input to `scripts/generate-seed.mjs` only, and are marked
legacy in-file.

## Transactional email (Phase 5)

`lib/services/email.ts` + `lib/services/notifications.ts`. Table-based inline-styled
HTML with a plain-text part (Gmail strips `<style>`; text improves deliverability).

Wired at these points:
* **customer confirmation + healer notification** — from `/api/booking/verify`
  *and* from the Razorpay webhook as a backstop, so a customer who closes the tab
  still gets a receipt. Idempotency comes from `webhook_events`, so a retried
  delivery cannot email twice.
* **cancellation, both sides** — from the customer action and the admin action.

Two deliberate properties:
1. **An email failure never fails the booking.** `notifyBookingConfirmed` returns
   void and logs; a paid session is confirmed whether or not the receipt sends.
2. **The healer's copy contains no amount, no payment id, no customer phone** —
   the same privacy boundary the healer portal enforces.

Awaited rather than fire-and-forget, because a serverless function can be frozen
the instant a response is returned and a detached promise would silently never run.

## Bulk imports (Phases 10–11)

`/admin/healers/import` and `/admin/blog/import`, sharing one engine.

`lib/services/tabular-read.ts` reads **CSV and XLSX with no dependency**: a zip
central-directory reader, `sharedStrings.xml` resolution, inline strings, and
cell-reference-aware column alignment so sparse rows stay aligned. The CSV parser
is a state machine, not `split(",")` — healer bios contain commas, quoted quotes
and newlines.

Flow: upload → parse → validate → preview → confirm → import. Rows stage into
`import_batches` / `import_rows` (already existed from migration 0007), so Confirm
operates on exactly what was previewed rather than re-parsing.

**Invalid rows are never skipped.** The Confirm button does not render while any
row has an error; there is a downloadable error report instead. Unknown modality,
language or category values are caught at preview rather than surfacing as an
unreadable foreign-key error. Imported healers are created as drafts with
calendars closed, so nobody becomes bookable before agreeing a schedule.

## PDF export (Phase 12)

`lib/services/pdf.ts` — a minimal PDF writer: core Helvetica (nothing embedded),
object graph, byte-offset xref table, pagination, landscape for wide tables. Now
offered alongside CSV and XLSX on healers, bookings, payments, customers and blogs.

**Stated limitation, not hidden:** core WinAnsi fonts cannot render Devanagari, so
a dataset containing Hindi names should be exported as XLSX or CSV. This is
documented at the top of the module rather than silently dropping characters.

## Not implemented

```
Google OAuth live verification   BLOCKED — no credentials, no network
Cloudinary live upload           BLOCKED — no credentials, no network
Practice inline images in body   NOT BUILT — cover image only
Email: password reset template    NOT BUILT — Supabase Auth sends its own
Healer invitation email template  IMPLEMENTED but UNUSED — Supabase Auth sends
                                  the invite. Kept for when you want branding.
```

---

# 2. COMPILED / BUILD VERIFIED

## BLOCKED — no network egress from this environment

You asked me to retry. I did, and tested further than before:

```
$ npm install                                    → E403
$ curl https://registry.npmjs.org/zod            → http=000
$ curl https://api.github.com                    → http=000
$ curl https://esm.sh/zod                        → http=000
$ curl https://cdn.jsdelivr.net/npm/zod/...      → http=000
$ curl --proxy http://localhost:3128 ...         → "403 from proxy after CONNECT"
```

**Every external host is refused at CONNECT, not just npm.** There is no
alternative registry, CDN or mirror to fall back to, and no vendored cache.

| Command | Status |
|---|---|
| `npm install` | **BLOCKED — proxy refuses all egress** |
| `npm run typecheck` | **BLOCKED — `sh: 1: tsc: not found`** |
| `npm run build` | **BLOCKED — no dependencies** |
| `npm run check` | **VERIFIED — 279 modules, 0 problems** |
| `npm run check:migrations` | **VERIFIED — 14 files, 0 problems** |
| `npm run audit` | **VERIFIED — 0 unguarded routes, 0 unauthorised actions, 0 secrets** |

Six passes, never compiled. This is the dominant risk and I cannot resolve it
from here.

## What I verified instead, by execution

Where I could not run the real tool, I validated the risky byte-level logic
against an independent implementation:

| Check | Method | Result |
|---|---|---|
| XLSX **writer** zip layout | parsed by Python `zipfile`, `testzip()` clean | **VERIFIED** (pass 3) |
| XLSX **reader** zip layout | read a Python-produced `ZIP_DEFLATED` archive; entries and sharedStrings resolved | **VERIFIED** |
| PDF object graph + xref | reader-style walk: `startxref` → xref table → offset → object 1 is `/Type /Catalog` | **VERIFIED** |
| Migration analyzer itself | negative test: removed a pinned `search_path`, caught, restored | **VERIFIED** |
| Hook/comment checker itself | negative test: injected `useState` into a server component, caught, restored | **VERIFIED** |

---

# 3. DATABASE VERIFIED

## BLOCKED — no PostgreSQL and no network to reach a hosted instance

```
$ which psql initdb pg_ctl supabase   → none
$ npx --yes supabase --version         → E403 (cannot download the CLI)
```

| Item | Status |
|---|---|
| `npx supabase db push` | **BLOCKED — no CLI, no network** |
| `psql -f supabase/seed.sql` | **BLOCKED — no psql** |
| `psql -f supabase/seed.dev.sql` | **BLOCKED — no psql** |
| RLS tests with real JWTs (Phase 3) | **BLOCKED — requires a running database** |
| Migration internal consistency | **VERIFIED by static analyzer** — see below |

### Static migration analysis — VERIFIED

```
migrations: 14 files
  extensions 3  types 14  tables 36  views 4  functions 33  policies 40  triggers 25
check:migrations OK
```

Checked and passing: no FK references a table created later; no enum or
`public.timerange` used before `CREATE TYPE`; no `is_staff()`/`has_role()`/
`current_healer_id()` called before definition; `btree_gist` before both
`EXCLUDE USING gist` constraints; `citext` before first use; no duplicate index,
policy or trigger name without a preceding `DROP IF EXISTS`; **all 33 SECURITY
DEFINER functions pin `search_path`**; RLS blanket-enabled with the migration's
own self-check; no table created after the RLS migration.

**This is not a Postgres parser and does not prove the SQL executes.**

---

# 4. BROWSER / END-TO-END VERIFIED

## BLOCKED — nothing has been executed in a browser

Every item in your Phase 20 matrix that needs a runtime:

| Test | Status |
|---|---|
| Admin login / user management | **BLOCKED — no running app** |
| Healer login / profile / availability | **BLOCKED — no running app** |
| Customer signup, public browsing | **BLOCKED — no running app** |
| Booking → Razorpay → webhook → confirmation | **BLOCKED — no app, no Razorpay credentials** |
| Email delivery | **BLOCKED — no `RESEND_API_KEY`.** Integration complete; **IMPLEMENTED — CREDENTIALS REQUIRED FOR LIVE DELIVERY** |
| Analytics pipeline, `select count(*) from page_views` | **BLOCKED — no database** |
| Blog CMS create → publish → public | **BLOCKED — no running app** |
| Practice CMS create → publish → public | **BLOCKED — no running app** |
| Healer / blog import | **BLOCKED — no running app.** Zip-reader byte logic **VERIFIED** separately |
| CSV / XLSX / PDF export | **BLOCKED — never generated from real data.** Byte layouts **VERIFIED** separately |
| Cloudinary upload | **BLOCKED — no credentials** |
| Google OAuth | **BLOCKED — no credentials** |
| RLS / role separation | **BLOCKED — requires real JWTs** |

## Frontend regression check (Phase 18) — VERIFIED statically

The chakra system was a stated concern. Every chakra file is **unmodified** since
before this pass began — `chakra-explorer`, `chakra-figure`, `chakra/figure`,
`chakra/lotus/*`, `seed-sound-player`, `motion/chakra-hero`, `chakra-facets`,
`chakra-concepts`, `spine`, `chakra-theme`, `lib/data/chakras.ts`,
`app/chakras/page.tsx`.

Only `app/chakras/[slug]/page.tsx` changed, and only its **data source** for
cross-links. `SeedSoundPlayer`, `ChakraLotusFor`, `bija` and `bijaNote` rendering
are all still present and untouched. The analytics tracker shares no code with the
chakra or audio systems. 38 files retain `useReducedMotion` / `prefers-reduced-motion`.

**NOT VERIFIED:** that the silhouette renders correctly, audio plays, or text
contrast holds — all require a browser.

**14 of 38 public pages now read Supabase**: blog, book, bookings, chakras/[slug],
healers, healers/[slug], healing/[slug], healy, library, library/[slug],
paths/[slug], practices, practices/[slug], signin. The remaining 24 are static
marketing and legal pages with no dynamic data, correctly.

---

# Blockers, in order

1. **No network egress from the build environment.** This blocks install,
   compile, build, the Supabase CLI and every runtime test. Six passes. Nothing I
   write can fix it — it needs to run somewhere with network access.
2. **Nothing has ever been compiled.** Expect TypeScript errors on first run. The
   likeliest source remains the hand-written `lib/supabase/types.ts` — replace it
   with `npm run db:types` output as soon as the database exists.
3. **No database has applied the 14 migrations.**

# Credentials still required

| Variable | Without it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | analytics collector drops events (202); no invitations, webhooks or exports |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `/api/checkout` returns 503 *before* holding a slot |
| `RAZORPAY_WEBHOOK_SECRET` | webhook returns 503 |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | no booking confirmation, no cancellation email |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | upload disabled; URL field offered instead |
| `ANALYTICS_SALT` | falls back to a dev salt — set in production |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | Google button hidden |

All 12 referenced variables are documented in `.env.example`, verified by the
audit. No `NEXT_PUBLIC_` variable looks secret. No credentials are committed.

# First commands, in order

```bash
npm install
npm run check && npm run check:migrations && npm run audit   # expect: all OK
npm run typecheck                                            # expect errors — never run
npm run build
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
npm run db:types && npm run typecheck                        # replace hand-written types
```

Then the two things that prove the system is alive:

```sql
select count(*) from page_views;   -- non-zero after opening the public site
select count(*) from practices where status = 'published';   -- 4 after seeding
```

Then the chain: sign in at `/healer/login`, set Monday 10:00–15:00, save, and
confirm `/book` offers only those times.
