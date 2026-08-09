# HealerJi — backend foundation, pass 1

## What this pass is

The data layer, security model and authentication the admin portal, healer
portal and public website will all sit on. Not the portal screens themselves —
those are pass 2 onwards.

Scope was agreed as the foundation slice because everything else in the brief
depends on it, and because it is the part that can be reviewed by reading.

---

## ⚠️ Verification status — read this first

**No code in this pass has been executed.** The build environment had no npm
registry access (403) and no PostgreSQL, so:

| Check | Status |
|---|---|
| `npm run typecheck` | **Not run** — could not install dependencies |
| `npm run build` | **Not run** — same |
| Migrations applied to a database | **Not run** — no Postgres available |
| Seed loaded | **Not run** |
| SQL dollar-quote / paren / terminator balance | Passed (static checker) |
| All `@/…` imports resolve to real files | Passed (static checker) |
| No secret or service-role client reachable from a client component | Passed (static checker) |
| Tailwind classes used exist in `tailwind.config.ts` | Passed |
| Seed content matches `lib/data/*.ts` byte-for-byte | Passed (generated, not transcribed) |

Requirement 65 asked me to run typecheck and build and fix all errors. I could
not, and I am not going to claim otherwise. **Expect to fix compile errors on
first build.** The likely spots are the hand-written `lib/supabase/types.ts`
(replace it with `npm run db:types` output as soon as the project exists) and
strict-mode narrowing in the service layer.

---

## Apply it

```bash
npm install                                  # firebase removed; lockfile will change
npx supabase link --project-ref <ref>
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
npm run db:types                             # replaces the placeholder types
npm run typecheck && npm run build
```

Then bootstrap yourself as super_admin — see `supabase/README.md`. There is no
admin password in `.env`, deliberately.

---

## What is now real

**Double booking is impossible.** Not "checked for" — impossible. A GiST
exclusion constraint on `(healer_id, tstzrange(starts_at, blocks_until))` means
two concurrent transactions cannot both commit an overlapping booking. The
loser gets SQLSTATE 23P01, surfaced as *"that time was just taken"*. There is
no read-then-write window because `create_booking_hold()` makes the insert
itself the availability check.

**Slots come from real data.** `get_available_slots()` computes from weekly
rules, one-off windows, holidays, recurring breaks, buffer, minimum notice,
maximum advance, timezone, and live bookings. The hash-based generator in
`lib/booking/availability.ts` is superseded.

**Prices are server-side only.** `resolve_session_price()` reproduces the
existing pro-rata rule (base rate = 45 min). A client-supplied amount is never
accepted anywhere.

**Payment is proven, not asserted.** Signature verification for both the
handler and webhook flows, constant-time compare, webhook idempotency via a
unique `(provider, event_id)`, and a trigger that rolls payment state up into
booking state. A booking becomes `confirmed` only when a payment row reaches
`captured`.

**Roles cannot be self-granted.** Beyond RLS, `guard_role_changes()` blocks
non-admins outright, restricts minting admin/super_admin to super_admin, and
forbids anyone editing their own roles. `guard_healer_self_edit()` stops a
healer changing their own price, ranking, visibility or verification badges.

**Financial and audit records cannot be destroyed.** `BEFORE DELETE` triggers
on `payments` and `refunds` raise. `admin_audit_logs` rejects UPDATE and
DELETE, and a trigger redacts anything key-shaped before insert.

**Analytics cannot be forged.** RLS grants no INSERT on the analytics tables to
`anon` or `authenticated`. Ingestion is service-role only, from a route
handler, with a daily-rotating salted visitor hash — no raw IP is stored.

**The seed is your content, not placeholders.** `scripts/generate-seed.mjs`
parses `lib/data/*.ts` and emits SQL. All 6 healers, 13 modalities, 6 articles,
4 testimonials and 4 practices carry over verbatim — apostrophes, Devanagari
and em-dashes intact. The script *fails* rather than guessing if a healer
references a modality that does not exist.

---

## Two decisions you should know about

**1. The seed creates no availability, and sets `accepting_bookings = false`.**
Inventing a schedule would let a real customer book a time no healer agreed to,
and someone would not show up. Availability must be entered by a human.
`supabase/seed.dev.sql` opens everyone Mon–Sat for **local testing only**.

**2. `FORCE ROW LEVEL SECURITY` is deliberately not used.** FORCE subjects the
table owner to RLS, and every `SECURITY DEFINER` function here runs as the
owner — signup and booking would break outright. Clients connect as
`anon`/`authenticated`, who are subject to RLS either way, so FORCE adds no
protection.

---

## Not built in this pass

Admin screens (analytics, bookings, healers, customers, blog CMS, payments,
audit, users, settings), healer portal screens beyond the dashboard, bulk
import/export, Cloudinary upload UI, and the cutover of the public site from
`lib/data/*.ts` to the database.

The database, RLS, services and permission matrix for all of them exist.

`/admin/dashboard` lists what is missing rather than showing empty screens that
imply otherwise.

---

## The public site is untouched

`lib/data/healers.ts`, `lib/data/articles.ts`, `lib/booking/store.ts` and
`lib/booking/availability.ts` are still in place and still imported by 14 pages
and components. Nothing on the live site changed except `/signin`, which moved
from magic-link to email/password as agreed.

Cutover order for pass 2, lowest risk first:

1. `app/healers/page.tsx` + `components/home/healers-section.tsx` →
   `listPublicHealers()`
2. `app/healers/[slug]/page.tsx` → `getPublicHealer()`
3. `app/blog/*`, `app/library/*` → articles service
4. `components/booking/calendar.tsx` → `getAvailability()` from
   `lib/services/availability`
5. `components/booking-flow.tsx` + `app/api/checkout` → `createHold()`
6. Delete `lib/booking/store.ts` last, once `/bookings` reads from the database

---

## Security tests you must run (requirement 52)

I could not run these — no database. Each one should **fail**:

```sql
-- as a healer's JWT
update public.healers set price_paise = 1 where id = '<own id>';        -- 42501
update public.healers set bio = 'x'      where id = '<another healer>'; -- 0 rows
insert into public.user_roles values (auth.uid(), 'admin');             -- 42501
select * from public.payments;                                          -- 0 rows

-- as a customer's JWT
select * from public.bookings where customer_id <> auth.uid();          -- 0 rows
select * from public.admin_audit_logs;                                  -- 0 rows
select * from public.page_engagement_report(now() - interval '7 days', now()); -- 42501

-- as anyone
insert into public.analytics_events (visitor_id, name) values ('x','y'); -- denied
update public.admin_audit_logs set action = 'x';                         -- 42501
delete from public.payments;                                             -- 42501
```

And over HTTP, unauthenticated: `/admin`, `/admin/dashboard`, `/healer/dashboard`
must all redirect to the relevant login. Confirm with `curl -I`, not just a
browser — middleware alone is not the boundary, so also confirm a customer JWT
calling the REST API directly gets nothing.

Concurrency: fire two `create_booking_hold()` calls at the same slot
simultaneously. Exactly one must succeed.
