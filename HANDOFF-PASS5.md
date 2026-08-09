# HealerJi — pass 5

Four separate status levels, never collapsed:
**IMPLEMENTED** · **COMPILED / BUILD VERIFIED** · **DATABASE VERIFIED** · **BROWSER / END-TO-END VERIFIED**

---

# 1. IMPLEMENTED

## Fixed this pass — real defects found by new analyzers

**No `.gitignore` existed.** The repository had none, across four passes. `git add .`
after an `npm install` would have committed `node_modules`, and — far worse — any
`.env.local` holding `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET` or
`CLOUDINARY_API_SECRET`. Those are the credentials that bypass Row Level Security
and move money. A `.gitignore` is now in place that ignores `.env*` while keeping
`.env.example`, plus `node_modules`, `.next`, `.vercel` and `supabase/.env`.

**Nothing needed rotating** — the secret scan found no committed credentials.

**Three false positives in my own tooling**, each fixed at the root rather than
worked around:
* the migration analyzer kept comments inside dollar-quoted function bodies, so
  `-- SECURITY DEFINER ...` in a comment read as a declaration;
* it bounded function headers by `$`, which had already been stripped, so it read
  into the *next* function and blamed the wrong one;
* the route auditor classified zones with `startsWith("/healer")`, which claimed
  the **public** `/healers` directory as an unguarded private route.

Each analyzer was then validated with a **negative test**: I injected a genuine
defect (removed a pinned `search_path`; added a hook to a server component),
confirmed it was caught, and restored the file.

## Built this pass

**Analytics tracking, wired (Part 7).** The dashboard was previously guaranteed
empty. Now:
* `app/api/analytics/collect/route.ts` — derives `visitor_id` server-side from a
  salted daily hash of (IP, user-agent); the raw IP is never stored. Device,
  browser, OS and bot status are parsed from the user-agent *here*, not reported
  by the page. `user_id` comes from the session cookie, so a client cannot claim
  to be someone else. Event names are validated against the registry, so the
  table cannot be used as arbitrary storage.
* `components/analytics/tracker.tsx` — mounted once in the root layout inside
  `<Suspense>` (it reads `useSearchParams`; without the boundary every public
  page would lose static generation). Tracks `session_start`, `page_view`,
  `page_exit` with engagement time measured **only while the tab is visible**,
  scroll-depth milestones at 25/50/75/100, and referrer host + UTM.
* CTA, booking-intent and outbound clicks are captured by **one delegated
  listener**, so the design system was not touched and new buttons are tracked
  automatically.
* Booking funnel instrumented in `components/booking-flow.tsx`:
  `booking_start`, `booking_slot_selected`, `booking_details_submitted`,
  `payment_success`, `payment_failure`, `booking_complete` — the last two fired
  only once the **database** reports `confirmed`, so the funnel cannot
  over-count a payment that did not settle.

**`/admin/users` (Part 5).** List, search, role and status filters, pagination,
role counts, invitations. Built on the existing RBAC — no second permission
system. Three independent layers: `authorise("roles.manage")` (super_admin only),
an explicit self-target check for a readable message, and
`guard_role_changes()` in the database, which is the layer that cannot be
bypassed. Role writes deliberately use the **caller's session client, not the
service role** — the service role would bypass the trigger's `auth.uid()` checks
and silently permit self-escalation. Also refuses to remove the last super_admin,
which no database constraint covers.

**Three runnable analyzers**, now in `package.json`:
```
npm run check              static integrity, 260 modules
npm run check:migrations   migration ordering and dependencies
npm run audit              route tree, server actions, secrets, Vercel readiness
npm run verify             all three, then typecheck and build
```

## NOT implemented this pass

```
/admin/practices             Guided Practices CMS — NOT BUILT
public /practices cutover    still reads lib/data/practices.ts
                             (consumers: app/practices/page.tsx,
                              app/practices/[slug]/page.tsx,
                              components/practice-player.tsx,
                              app/chakras/[slug]/page.tsx, app/sitemap.ts)
/admin/healers/import        bulk healer import — NOT BUILT
/admin/blog/import           bulk blog import — NOT BUILT
PDF export                   NOT BUILT (CSV and XLSX are real)
Email system (Part 16)       NOT BUILT — no send on booking confirmation,
                             cancellation, or healer session notification.
                             Only /api/contact and /api/healer-apply send mail.
```

I did not build these. Parts 1–7 were your stated priority order and consumed the
pass.

---

# 2. COMPILED / BUILD VERIFIED

## NOT VERIFIED — npm registry unreachable from this environment

```
$ npm install
npm error code E403
npm error 403 Forbidden - GET https://registry.npmjs.org/@gsap%2freact
```

You asked me to retry, and to check whether the block was specific to
`@gsap/react`. **It is not.** I tested every dependency individually:

```
$ npm view next version        → error
$ npm view typescript version  → error
$ npm view react version       → error
$ npm view zod version         → error
$ curl https://registry.npmjs.org/next   → http=000
$ curl https://unpkg.com/next            → http=000
```

The proxy blocks the entire registry, not one package. Therefore:

| Command | Status |
|---|---|
| `npm install` | **FAILED — E403, whole registry unreachable** |
| `npm run typecheck` | **NOT VERIFIED — `sh: 1: tsc: not found`** (install failed) |
| `npm run build` | **NOT VERIFIED — no dependencies present** |

`npm run check` passing on 260 modules is **not** a compile. It proves imports
resolve, named exports exist, no client module reaches a `server-only` module or
a secret, and hooks appear only in client modules. It cannot check a single type.

**This remains the project's largest risk, unchanged for five passes.**

---

# 3. DATABASE VERIFIED

## NOT VERIFIED — no PostgreSQL in this environment

```
$ which psql initdb pg_ctl supabase
(none)
```

`npx supabase db push` and `psql -f supabase/seed.sql` were **NOT RUN**.

What I did instead, since I could not execute them, was write and run a real
migration analyzer (`scripts/check-migrations.mjs`) that simulates the parts of a
fresh sequential apply which can be checked statically. Result:

```
migrations: 13 files
  extensions 3  types 14  tables 36
  views 3  functions 33  policies 40  triggers 25
check:migrations OK — no ordering or dependency problems found.
```

Specifically checked and passing:
* no foreign key references a table created later
* no enum or `public.timerange` used before its `CREATE TYPE`
* no `public.is_staff()` / `has_role()` / `current_healer_id()` called before definition
* `btree_gist` exists before the two `EXCLUDE USING gist` constraints; `citext` before first use
* no duplicate index, policy or trigger name without a preceding `DROP ... IF EXISTS`
* every `SECURITY DEFINER` function pins `search_path` (33 functions)
* RLS blanket-enabled, with the migration's own self-check that raises if any
  public table lacks it
* no table created *after* the RLS migration, which would silently miss it

**This is not a Postgres parser and does not prove the SQL executes.** It rules
out the class of failure that only appears on a fresh sequential apply.

---

# 4. BROWSER / END-TO-END VERIFIED

## NOT VERIFIED — nothing has been executed in a browser or against a database

Every flow in Part 23 is **NOT VERIFIED**, for the same two reasons above.

| Flow | Status |
|---|---|
| A — healer login → profile → availability → save | **NOT VERIFIED — no running app** |
| B — customer books via real availability → Razorpay → pay | **NOT VERIFIED — no running app, no Razorpay credentials** |
| C — booking confirmed → admin → healer → payment → analytics | **NOT VERIFIED — no database** |
| D — admin edits healer / publishes blog / practice → public | **NOT VERIFIED — no running app** |
| E — healer A vs B, editor vs admin, unauthenticated /admin | **NOT VERIFIED — requires real JWTs** |
| availability → `get_available_slots` → public `/book` | **NOT VERIFIED at runtime.** Statically confirmed: the editor writes `healer_availability_rules`, `availability_exceptions`, `healer_breaks`, `healer_booking_settings`; `get_available_slots` reads exactly those; `/api/booking/slots` calls it; the healer page preview calls the same function. Same code path, unexecuted. |
| analytics → collector → Supabase → dashboard | **NOT VERIFIED at runtime.** Wiring is complete and traceable in source. |
| XLSX export opens in Excel | **NOT VERIFIED.** The zip byte layout was validated against a standards-compliant zip reader in pass 3; the export has never been generated from real data. |

## What *was* actually executed this pass

| Check | Result |
|---|---|
| `node scripts/check.mjs` | **PASSED** — 260 modules |
| `node scripts/check-migrations.mjs` | **PASSED** — 13 files, 0 problems |
| `node scripts/audit-routes.mjs` | **PASSED** — 0 unguarded private routes, 0 unauthorised actions, 0 committed secrets |
| `node scripts/generate-seed.mjs` | **PASSED** — regenerated seed from source data |
| Negative test: migration analyzer | **PASSED** — injected an unpinned `search_path`, caught, restored |
| Negative test: hook checker | **PASSED** — injected `useState` into a server component, caught, restored |
| Route inventory | 39 public pages, 18 admin, 7 healer, 8 API routes, 22 server actions |
| Legacy data consumers | **0** for healers and articles |

---

# Remaining blockers

1. **Compile.** Never run. `npm install && npm run typecheck` on your machine is
   the single highest-value action available to this project.
2. **Database.** 13 migrations never applied.
3. **Practices** are still static — the last remaining legacy data source.
4. **Email** sends nothing on booking. A customer who pays currently receives no
   confirmation email.

# Credentials still needed

| Variable | Needed for | Without it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | webhooks, analytics ingestion, invitations, exports | collector returns 202 and drops events; dashboard stays empty |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | taking payment | `/api/checkout` returns 503 before holding a slot |
| `RAZORPAY_WEBHOOK_SECRET` | server-verified confirmation | webhook returns 503 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `_API_SECRET` | image upload | upload disabled, URL field offered instead |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | transactional email | contact and application forms return 503 |
| `ANALYTICS_SALT` | visitor hashing — `openssl rand -hex 32` | falls back to a dev salt; set it in production |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | optional Google sign-in | button hidden |

By hand in the Supabase dashboard: email confirmations on, `/auth/callback` in
redirect URLs, `btree_gist` enabled, and bootstrap the first `super_admin` per
`supabase/README.md` — until one exists, `/admin/users` will tell you role
management is locked.

# First commands to run

```bash
npm install
npm run check && npm run check:migrations && npm run audit
npm run typecheck          # expect errors — never executed
npm run build
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$LOCAL_DB_URL" -f supabase/seed.dev.sql   # availability, so /book has slots
```

Then confirm analytics is alive before trusting the dashboard: open the public
site, and check `select count(*) from page_views;` is non-zero.
