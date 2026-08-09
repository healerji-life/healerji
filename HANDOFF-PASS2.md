# HealerJi — pass 2

## ⚠️ Verification status

Same environment limits as pass 1. **npm registry blocked (403), no PostgreSQL,
no `tsc`.** Requirement 40 could not be executed:

| Check | Status |
|---|---|
| `npm install` / `typecheck` / `build` | **Not run** — no registry access |
| Migrations applied | **Not run** — no Postgres |
| Security tests from pass 1 | **Not run** — no database |
| `npm run check` (new static checker) | **Passes** — 198 modules |
| SQL balance checker | Passes on all 13 migrations + seed |

`npm run check` is new in this pass and is the honest substitute for `tsc`. It
proves: every `@/…` import resolves; every *named* import actually exists as an
export; no `"use client"` module reaches a `server-only` module or reads a
non-`NEXT_PUBLIC_` env var; hooks only appear in client modules; and a manifest
of required files exists.

**It caught a real bug.** `app/admin/(portal)/layout.tsx` — the file containing
the portal's `requireStaff()` gate — was silently never written, because a
shell `&&` chain broke on an unrelated failure. Without the manifest check that
would have shipped as an unguarded portal. It is fixed, and the manifest
assertion now prevents a recurrence.

Run this first, before anything else:

```bash
npm install && npm run check && npm run typecheck && npm run build
```

---

## What pass 2 actually delivers

**A static checker** (`scripts/check.mjs`, `npm run check`) — because the real
risk to this project is that nobody has yet compiled pass 1.

**Foundation repairs.** Sort columns arriving from the query string were passed
straight to `.order()`; they now go through `safeSort()` against a per-service
allowlist, which removes both a typing risk and a column-probing vector. Search
terms go through a shared `sanitiseSearch()`. `crypto.subtle` is now an explicit
`webcrypto` import rather than an ambient global.

**The admin shell** — route group `app/admin/(portal)/`, so `/admin/login` sits
outside the authenticated layout. Sidebar filtered by permission *on the server*,
so an editor is never sent the markup for Payments. Brand palette, `e-1`/`e-2`
elevation, restrained motion. Mobile drawer. Route-level `loading.tsx` skeleton
and `error.tsx` boundary that shows a digest, not a stack.

**A real dashboard.** Six stat cards, four charts, recent bookings, top healers,
top blogs, integration status. Every figure comes from
`admin_dashboard_summary()` / `admin_daily_series()` / `admin_top_healers()` —
new `SECURITY DEFINER` functions that enforce `is_staff()` inside the database.
Charts are server-rendered SVG: zero JavaScript, no library version to drift,
and they cannot disagree with the table beside them. Period-on-period deltas are
suppressed when there is no baseline, and a metric with no data renders
"No data yet" rather than a zero.

**Healer management, end to end.** List with server-side search, status/modality/
featured filters and pagination, all held in the URL. Create and edit forms
covering every field the public profile renders. Archive and restore. Every
server action re-authorises (`authorise("healers.manage")`) before touching
anything, writes an audit entry, and calls `revalidatePath` on both the old and
new slug so a rename does not strand a stale page.

**Cloudinary upload, for real.** Browser → Cloudinary directly, signed by
`/api/admin/upload-signature`. The binary never passes through a Vercel function,
the repo, or Postgres. The folder is chosen from a server-side allowlist, not
from the request. When credentials are absent the control says so and offers a
URL field instead of a picker that fails on click.

**Healer invitations.** `inviteUserByEmail`, then link the account and grant the
`healer` role. There is no password field and there never will be.

**Public cutover — healers.** `/healers`, `/healers/[slug]`, the homepage
featured section and the sitemap now read Supabase. The design system is
untouched: `lib/services/healer-adapter.ts` maps the database row onto the
existing `Healer` type, so `HealerCard`, `HealerBrowser` and the profile page
render exactly as before.

---

## One thing I changed that you should know about

`nextAvailable: string` on the `Healer` type is gone, replaced by
`nextAvailableAt: string | null`.

It held prototype fiction — `"Today, 6:30 pm"` — and the "available today"
filter worked by calling `startsWith("Today")` on it. Carrying that into a
database-backed site would mean the card advertising times no healer had agreed
to, and someone not showing up.

It is now computed by `healer_next_available()`, which walks forward up to 14
days through the same slot generator the booking calendar uses. A healer with no
published availability returns `null`, and the card says "Times to be announced".
`lib/data/healers.ts` has been normalised to `nextAvailableAt: null` so it still
compiles for the pages not yet cut over.

---

## Not built — be clear-eyed about this

Your brief listed roughly fifteen admin screens plus the full healer portal,
bulk import, exports, and the remaining cutovers. I built the shell, the
dashboard, and healers end to end. **The following are still not built:**

`/admin/analytics` · `/admin/bookings` · `/admin/customers` · `/admin/payments` ·
`/admin/blog` (+ new/[id]) · `/admin/practices` · `/admin/users` · `/admin/audit` ·
`/admin/settings` · healer portal beyond the dashboard (availability editor,
sessions, profile, settings) · bulk CSV/XLSX import · exports · blog/book/bookings
public cutover.

The reason is not time — it is that writing another ~15,000 lines that have never
been compiled would hand you a debugging job, not a product. Screen #12 is worth
very little until screen #1 builds. The database functions, services and
permission matrix behind most of the above already exist from pass 1; what is
missing is UI, and UI is exactly what an unverified toolchain gets wrong.

`/admin/dashboard` lists what is missing rather than linking to blank screens.

---

## Cutover status

| Route | Source |
|---|---|
| `/healers` | **Database** |
| `/healers/[slug]` | **Database** |
| Homepage featured healers | **Database** |
| `sitemap.ts` (healer URLs) | **Database** |
| `/blog`, `/library/*` | still `lib/data/articles.ts` |
| `/book`, `/bookings` | still `lib/booking/store.ts` + `availability.ts` |
| `/chakras/*`, `/paths/*`, `/healing/*` | still `lib/data/healers.ts` (cross-links only) |
| `api/checkout` | still `lib/data/healers.ts` |

`lib/data/healers.ts` is retained deliberately and is marked legacy at the top.
Delete it only once `booking-flow`, `api/checkout` and the three cross-link
pages read the database.

**The booking cutover is the highest-value remaining work**, and it is
delicate: `components/booking/calendar.tsx` currently calls a `getAvailability`
that returns `DayAvailability` directly, while the service returns
`Result<DayAvailability>`, and `api/checkout` must move to `create_booking_hold`
so the slot is actually reserved. Doing that blind, without being able to run
it, is how you get a booking system that takes money and loses the slot.

---

## New migrations (additive — nothing from pass 1 was altered)

* `0012_admin_reporting.sql` — dashboard summary, daily series, top healers,
  top articles, per-page detail, event totals. All `is_staff()`-guarded.
* `0013_next_available.sql` — real next-available slot, single and batch.

Apply with `npx supabase db push`. Pass 1 migrations are unchanged, so this is
a forward-only addition.

---

## Security checks still outstanding

Everything in `HANDOFF.md` under "Security tests you must run" remains unrun,
because there is still no database. In addition, verify for this pass:

```
curl -I https://<host>/admin/dashboard          # 307 -> /admin/login
curl -I https://<host>/admin/healers            # 307 -> /admin/login
```

Then signed in as an **editor** (not admin): `/admin/healers` should load
read-only, `/admin/healers/new` must redirect to `/admin/login?reason=forbidden`
(editors lack `healers.manage`), and the sidebar must not contain Payments,
Customers, Users or Audit.

Then POST directly to the `createHealerAction` server action as a customer. It
must return a forbidden result — the form never being rendered is not the
control; `authorise()` is, and RLS is the one underneath that.
