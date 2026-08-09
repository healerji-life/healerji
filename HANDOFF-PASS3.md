# HealerJi — pass 3

## Toolchain: attempted, and the exact result

You asked me not to claim tests passed unless I ran them. I ran them.

```
npm install      FAILED  — E403 Forbidden from registry.npmjs.org
                           (curl to the registry returns http=000; proxy blocks CONNECT)
npm run typecheck NOT RUN — no tsc, because install failed
npm run build     NOT RUN — no dependencies
migrations        NOT RUN — no postgres/psql/initdb binaries in the environment
security suite    NOT RUN — requires a database
```

`npm run check` passes: **219 modules, no integrity problems.** That is a static
integrity check — imports resolve, named exports exist, no client module reaches
a server-only module or a secret. **It does not prove the application compiles.**

---

## Phase A — booking flow: DONE

This was the gated priority, so it got finished before anything else.

**The service/calendar mismatch is resolved properly, not cast away.** The
calendar is a client component; the availability service reaches for cookies. So
the shared vocabulary moved to `lib/booking/window.ts` (pure, no I/O), imported
by both sides. The client fetches `GET /api/booking/slots`, which unwraps
`Result<DayAvailability>` into `{ok:true,data}` / `{ok:false,error}`. One
definition, no duplicate function, no `as`.

**The flow now is:**

```
healer (from DB) -> session type -> date -> real slots (get_available_slots)
  -> details -> POST /api/checkout
       1. create_booking_hold()  reserves the slot, computes the amount
       2. Razorpay order created FOR that amount
       3. payments row written
  -> Razorpay checkout
  -> POST /api/booking/verify   HMAC(order|payment) checked server-side
  -> trigger flips booking to confirmed
  -> confirmation read back FROM the database
```

**Slot contention** returns 409; the UI shows *"This time was just booked. Please
choose another available time."*, clears the selection, refreshes availability and
returns to the time step.

**If the Razorpay order fails after the hold succeeded**, `releaseHold()` sets the
booking to `expired` immediately — which takes it out of the exclusion
constraint's WHERE clause, so the slot returns to the calendar at once rather
than staying blocked until the hold expires.

**Three things that can no longer happen:**

- A paid booking with no server record. `saveBooking()` to localStorage is gone;
  `lib/booking/store.ts` is a deprecation shim (the sandbox blocks `rm`).
- A confirmed booking on the browser's word. The UI only shows "booked" when the
  database returns `confirmed`; a verified-but-not-yet-flipped payment says so
  honestly and quotes the reference.
- A replayed webhook double-counting revenue. `webhook_events` has a unique
  `(provider,event_id)`; duplicates answer 200 and do nothing. Invalid
  signatures are **recorded then rejected**, so forgery attempts are visible.

The FNV hash slot generator is gone. `lib/booking/availability.ts` is a shim
re-exporting only the pure date helpers.

## Phase B — admin: DONE

* `/admin/bookings` — search, status, payment state, healer, session type, date
  range; all in the URL. Real pagination.
* `/admin/bookings/[id]` — customer, healer, session, payment records with
  Razorpay IDs and how each was verified, full status history from
  `booking_events`, and a status form. **It flags a confirmed booking with no
  captured payment as an anomaly** rather than hiding it in a pill.
* `/admin/payments` — net revenue, successful, failed with failure rate, refunds,
  average transaction. Average is `null` when nothing was captured, because the
  average of zero payments is undefined, not zero.
* `/admin/customers` + `/admin/customers/[id]` — bookings, upcoming, total paid
  (money *captured*, not quoted), refunds, full history.
* **Exports that actually produce files.** No `xlsx` package was installable, so
  `lib/services/spreadsheet.ts` writes OOXML into a zip directly — deflate,
  CRC32, central directory, EOCD. I validated the byte layout against a
  standards-compliant zip reader before relying on it. CSV includes a UTF-8 BOM
  and a formula-injection guard (`=`/`+`/`-`/`@` prefixed), because export cells
  come from user input.
* Exports reuse the screen's own filters and service, are permission-gated per
  dataset, and customer/payment/booking exports are written to the audit log.

## NOT DONE — the honest list

```
/admin/analytics          not built
/admin/blog (+new/[id])   not built
/admin/practices          not built
/admin/users              not built
/admin/audit              not built
/admin/settings           not built
/healer/availability      NOT BUILT  <- see below
/healer/sessions          not built
/healer/profile           not built
/healer/settings          not built
bulk import (healers/blogs)  not built
PDF export                not built
/blog + /library cutover  still lib/data/articles.ts
/chakras /paths /healing  still lib/data/healers.ts (cross-links only)
```

**`/healer/availability` not being built is the biggest gap in this pass**, and I
want to be direct about it: your success condition says *"if I change a healer's
availability in the healer portal, that change must affect the public booking
calendar."* The **backend** half of that is real and finished — `get_available_slots`
reads `healer_availability_rules`, exceptions, breaks, buffer and notice, and the
public calendar now consumes exactly that. What is missing is the editor UI, so
today those rows have to be inserted by hand or via `seed.dev.sql`. The wiring is
done; the screen is not.

The services for most of the remaining screens already exist (`listArticlesForAdmin`,
`getArticleById`, `listArticleCategories` were written this pass for the export
layer and are ready for the CMS).

I stopped here rather than continuing because your instruction was explicit:
build → verify → continue, and don't generate 15,000 lines and hope. With no
compiler, each additional screen adds unverifiable surface on top of a booking
flow that is the thing you most need to be correct.

## Migrations

No new migrations this pass. Pass 1 and 2 migrations (0001–0013) are unchanged.

## What to run first

```bash
npm install
npm run check        # expect: OK, 219 modules
npm run typecheck    # expect errors — this has never been run
npm run build
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$LOCAL_DB_URL" -f supabase/seed.dev.sql   # gives healers availability to test booking
```

Then the booking test that matters most:

1. `/book`, pick a healer, a date, a slot, fill details, click Pay.
2. Before paying, in a second browser, book the same slot. **One must get
   "This time was just booked."**
3. Complete payment in the first. Confirm the booking appears in
   `/admin/bookings` as `confirmed` / `paid`, with a captured payment carrying a
   Razorpay payment ID and `verified_via = handler`.
4. Cancel the Razorpay modal instead on a fresh attempt. The booking must stay
   `pending_payment` and must **not** appear as confirmed anywhere.
5. POST a forged body to `/api/booking/verify`. It must return 400 and write
   nothing.
