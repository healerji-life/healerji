# HealerJi — pass 4

## 1. Exact commands and their results

Run at the start of this pass, verbatim:

```
$ npm install
npm error code E403
npm error 403 Forbidden - GET https://registry.npmjs.org/@gsap%2freact
                                    → FAILED

$ curl -o /dev/null -w "%{http_code}" https://registry.npmjs.org/next
http=000                            → proxy blocks CONNECT

$ which psql initdb pg_ctl
(none)                              → no PostgreSQL in this environment

$ node scripts/check.mjs
check: OK — 251 modules, no integrity problems found.
                                    → PASSED
```

| Command | Result |
|---|---|
| `npm install` | **FAILED — E403, registry unreachable** |
| `npm run typecheck` | **NOT RUN — environment limitation** (no `tsc`) |
| `npm run build` | **NOT RUN — environment limitation** (no dependencies) |
| `npx supabase db push` | **NOT RUN — environment limitation** (no PostgreSQL) |
| Security test suite | **NOT RUN — environment limitation** (needs a database) |
| `npm run check` | **PASSED — 251 modules** |

## 2. What was actually tested

Only `npm run check`, which is a static integrity check: `@/` imports resolve,
every named import exists as a real export, no `"use client"` module reaches a
`server-only` module or reads a non-`NEXT_PUBLIC_` variable, hooks appear only in
client modules, and a manifest of required files exists.

Plus these greps, run and passing:

* all 16 admin pages call `requireStaff`/`requireAdmin`/`requirePermission`
* all 5 healer pages sit under a `requireHealer()` layout
* no healer action reads a healer id from `formData` — all 9 call sites derive it
  from the session via `requireHealerActor()`
* no client module imports a server-only service or reads a secret

**`npm run check` does not prove the application compiles.** Nothing in this pass
has been executed against a browser or a database.

## 3. What could NOT be tested

Every one of your seven integration tests. All require a running app and database:

| Test | Status |
|---|---|
| 1 — availability change reaches public calendar | **NOT RUN** |
| 2 — booking → Razorpay → confirmed → admin + healer | **NOT RUN** |
| 3 — blog draft → publish → public | **NOT RUN** |
| 4 — admin edits healer bio → public profile | **NOT RUN** |
| 5 — permission separation (healer A/B, editor) | **NOT RUN** |
| 6 — forged payment verification returns 400 | **NOT RUN** |
| 7 — filtered XLSX export opens and matches | **NOT RUN** |

The XLSX *archive layout* was validated in pass 3 against a standards-compliant
zip reader. The export end-to-end has still never been run.

## 4. What was implemented

### Phase 1 — healer availability (the priority)

* `lib/booking/schedule.ts` — pure, client-safe: time normalisation, 15-minute
  option grid, overlap detection, range merging, weekly-hours total. Imported by
  **both** the editor and the server action, so client and server validation
  cannot drift.
* `/healer/availability` — one card per day, mobile-first. Available/unavailable
  toggle, multiple ranges per day, add/edit/delete, and copy to weekdays / to
  every other day / to one specific day. Time selects rather than
  `<input type="time">` (consistent across browsers, keyboard-operable, and
  constrained to values the slot grid can use).
* Overlap prevention at three independent layers: live in the editor, again in
  the server action, and finally the existing
  `availability_rules_no_overlap` GiST exclusion constraint.
* Advanced settings — slot spacing, buffer, minimum notice, booking window, daily
  cap, timezone, accepting-bookings. Timezone is verified against `Intl` before
  saving, because an unrecognised zone would silently shift every slot.
* Exceptions — block a day, block a date range (holiday, one row per date so a
  single day can be unblocked later), or open extra hours outside the weekly
  pattern.
* **A live preview** on the page runs `get_available_slots` — the same function
  the public booking page calls — for tomorrow. If it is wrong there it is wrong
  publicly, and the healer sees it before a customer does.
* Save states: "Saving…", then the real outcome. Failures say
  *"Couldn't save availability. Please try again."* — never a database string.
* Every save calls `revalidatePath("/book")` and the healer's public profile.

No new availability logic was written. The editor writes
`healer_availability_rules`, `availability_exceptions`, `healer_breaks` and
`healer_booking_settings` — the exact tables `get_available_slots` already reads.

### Phases 2–4 — healer portal completed

* Route group `app/healer/(portal)/` with a `requireHealer()` layout, so
  `/healer/login` stays reachable while signed out. Bottom tab bar on phones.
* `/healer/sessions` — Today / Upcoming / Completed / Cancelled, real bookings.
  Shows the customer's note; deliberately shows **no** amount, payment id, email
  or phone.
* `/healer/dashboard` — today, this week, upcoming, next session, availability
  status, and profile completion computed from actual fields.
* `/healer/profile` — photo (Cloudinary), headline, bio, languages, practices.
  Price, verification, featuring and ranking are shown **read-only with an
  explanation** rather than hidden.
* `/healer/settings` — account, availability summary, security. Password change
  is an emailed Supabase link; there is no password field anywhere.

### Phase 5 — admin analytics

`/admin/analytics` on the existing pass-2 RPCs, plus `/admin/analytics/detail`
for one page: views, unique visitors, engagement, scroll depth, CTA clicks, book
clicks, booking starts, bookings, conversion, devices, referrers, all events.
Metrics with no rows behind them read **"Not enough data"**, never a fabricated
number. Conversion-by-day treats a zero-visitor day as 0 rather than a
divide-by-zero spike.

### Phase 6 — blog CMS and public cutover

* `/admin/blog`, `/new`, `/[id]` — create, edit, save draft, publish, unpublish,
  schedule, archive, with quick actions from the list.
* `components/admin/markdown-editor.tsx` — toolbar (headings, bold, italic, link,
  lists, quote, image) wrapping the selection, plus a live preview in the public
  site's typography. Markdown rather than a rich-text editor for three reasons:
  no installable dependency; the DB already derives `body_blocks` from markdown
  via `sync_article_body`, so the existing renderer keeps working; and markdown
  cannot carry a script tag, so the stored body is inert by construction. The
  preview HTML-escapes before rendering.
* **Public cutover complete.** `/blog`, `/library`, `/library/[slug]`, `/healy`,
  `/paths/*`, `/chakras/*`, `/healing/*` and `sitemap.ts` all read Supabase.
  `lib/services/article-adapter.ts` maps rows onto the existing `Article` shape,
  so the design system was not touched.
* Unpublishing removes the public page: `getPublishedArticle` reads the
  time-aware `published_articles` view, so the route `notFound()`s.

### Also built

`/admin/audit` — filters by actor, action, resource and date. No edit control,
because `block_audit_mutation()` makes the operation impossible.

`/admin/settings` — integration cards showing **Connected / Not configured**,
secrets rendered as `••••••••••••` and never read. Operational values from
`app_settings`, plus a security-posture summary.

### Legacy dependency removed

`lib/data/healers.ts` and `lib/data/articles.ts` have **zero remaining data
consumers** — verified by grep. The `Article` type moved to
`lib/content/article.ts`; both legacy modules remain (the sandbox blocks `rm`) and
are marked as input to `scripts/generate-seed.mjs` only.

## 5. NOT implemented — do not treat these as done

```
/admin/practices          Guided Practices CMS — NOT BUILT
/admin/users              user & role management — NOT BUILT
/admin/healers/import     bulk healer import — NOT BUILT
/admin/blog/import        bulk blog import — NOT BUILT
PDF export                NOT BUILT (CSV and XLSX are real)
public /practices cutover still reads lib/data/practices.ts
analytics tracker         /api/analytics/collect exists; NOT yet wired into the
                          public layout, so analytics tables stay empty
```

`/admin/users` is the one I would build next: role changes are the highest-risk
remaining surface, and `guard_role_changes()` already enforces the rules — only
the UI is missing.

## 6. Remaining blockers

1. **Nothing has ever been compiled.** Four passes, no `tsc` run. This is the
   single biggest risk to the project.
2. **No database has ever seen the migrations.** 13 migration files, unexecuted.
3. The analytics dashboard will show "No data yet" everywhere until the tracker
   is wired into the public layout and `SUPABASE_SERVICE_ROLE_KEY` is set. That
   is correct behaviour, not a bug.

## 7. Credentials still needed from you

| Variable | Needed for |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | webhooks, analytics ingestion, healer invitations, exports |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | taking payment |
| `RAZORPAY_WEBHOOK_SECRET` | server-verified confirmation |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | photo and cover uploads |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | booking confirmations, healer invitations |
| `ANALYTICS_SALT` | `openssl rand -hex 32` — salts the visitor hash |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | optional Google sign-in |

Also, by hand in the Supabase dashboard: email confirmations on, the
`/auth/callback` redirect URL, and `btree_gist` enabled.

## 8. First thing to run

```bash
npm install
npm run check          # expect OK, 251 modules
npm run typecheck      # expect errors — never run
npm run build
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Then the chain that matters, manually:

1. Sign in at `/healer/login`, set Monday to 10:00–15:00, save.
2. Open `/book`, choose that healer, pick next Monday. Only 10:00–15:00 slots
   should appear, spaced by your slot setting, respecting the buffer and notice.
3. Book one. Confirm it appears in `/admin/bookings` as confirmed/paid with a
   captured payment, and in `/healer/sessions`.
4. Cancel the Razorpay modal instead on a second attempt — the booking must stay
   `pending_payment` and appear nowhere as confirmed.
