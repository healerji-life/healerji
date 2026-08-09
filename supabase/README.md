# HealerJi database

## Applying it

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push                       # runs migrations/ in filename order
psql "$DATABASE_URL" -f supabase/seed.sql   # existing website content
```

Locally:

```bash
npx supabase start
npx supabase db reset          # migrations + seed.sql
psql "$LOCAL_DB_URL" -f supabase/seed.dev.sql   # test availability, local only
```

## Order matters

| File | Contains |
|---|---|
| `0001_extensions_and_enums` | `btree_gist`, `citext`, `pgcrypto`, all enums, `public.timerange` |
| `0002_identity_and_roles` | `profiles`, `user_roles`, `has_role/is_admin/is_staff`, role-escalation guard, `auth.users` triggers |
| `0003_healers` | healers, taxonomies, credentials, offerings, media, `healer_cards` view |
| `0004_availability` | weekly rules, dated exceptions, breaks, booking settings |
| `0005_bookings` | bookings + the overlap exclusion constraint, reference generator, status log |
| `0006_payments` | payments, refunds, webhook idempotency, booking payment rollup |
| `0007_content` | articles, categories, practices, testimonials, import staging, form captures |
| `0008_analytics` | sessions, page views, events, daily rollup, `page_engagement_report` |
| `0009_audit_and_settings` | append-only audit log with secret redaction, settings, notifications, exports |
| `0010_rls_policies` | **RLS for every table** + a self-check that fails if one is missed |
| `0011_availability_rpcs` | `get_available_slots`, `resolve_session_price`, `create_booking_hold` |

`0001` must run first: the exclusion constraints in `0004` and `0005` need
`btree_gist` and `public.timerange`, and both fail hard without them.

## Things to set by hand in the dashboard

The CLI cannot do these:

1. **Authentication → Providers → Email**: confirmations on.
2. **Authentication → URL Configuration**: add `https://<domain>/auth/callback`.
3. **Authentication → Providers → Google**: enable, paste client id/secret,
   add the same callback as an authorised redirect URI.
4. **Database → Extensions**: confirm `btree_gist` is enabled.
5. **Database → Backups**: verify PITR is on for the plan you are on. Nightly
   backups are the floor; this database holds financial records.

## Creating the first administrator

There is no admin password in an environment variable, by design. Bootstrap
once, from the SQL editor, after the person has signed up normally:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'you@healerji.com';
```

This works because `guard_role_changes()` allows role writes when `auth.uid()`
is null — which is the case in the SQL editor and for the service role, and is
never the case for a request from a browser. After the first super_admin
exists, every subsequent role change goes through the portal and is audited.

## Recovery expectations

* `payments` and `refunds` have a `BEFORE DELETE` trigger that raises. Financial
  records cannot be deleted by anyone, including an admin who clicked the wrong
  button. Change `status` instead.
* `admin_audit_logs` rejects `UPDATE` and `DELETE`. An audit log an admin can
  edit is not an audit log.
* Healers, articles, practices and profiles are archived (`status`,
  `archived_at`), never removed, so historical bookings stay readable.
* Deleting an `auth.users` row cascades to `profiles`. It does **not** delete
  bookings: `bookings.customer_id` is `ON DELETE SET NULL`, and the guest email
  captured at checkout keeps the record meaningful.
