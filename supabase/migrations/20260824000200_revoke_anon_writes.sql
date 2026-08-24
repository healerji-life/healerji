-- ==================================================== revoke anon writes ====
-- HJ-15. The anonymous role held table-level INSERT/UPDATE/DELETE on public
-- tables. Row Level Security meant those statements matched zero rows — the
-- audit confirmed this against production: anonymous UPDATE and DELETE on
-- healers, team_members and analytics_events all returned 204 having changed
-- nothing, and ground truth was re-read to prove it.
--
-- So this is defence in depth, not a live hole. What it buys: an unauthorised
-- write now fails loudly with 42501 instead of silently succeeding-as-no-op.
-- A silent no-op is indistinguishable from a policy that has been accidentally
-- loosened, which makes the difference matter for anything built later.
--
-- Deliberately scoped to `anon` only. `authenticated` keeps its grants: a
-- customer cancels their own booking, a healer edits their own schedule and
-- staff manage content, all mediated by RLS. Revoking there would break the
-- application.
--
-- What anon still needs, and keeps:
--   * SELECT on the public read surface — healers, team_members,
--     session_offerings and the published_* views. RLS narrows the rows.
--   * EXECUTE on the public RPCs. create_booking_hold() is SECURITY DEFINER,
--     so a guest checkout never needed a direct INSERT on bookings.
--
-- Nothing anonymous writes directly any more: analytics ingestion, the contact
-- form and healer applications all run server-side under the service role.

revoke insert, update, delete
  on all tables in schema public
  from anon;

-- Future tables must not quietly reintroduce the grant. This changes the
-- default only for objects created by the role that owns the migrations.
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;

-- Sequences: anon has no reason to advance one, since it cannot insert.
revoke usage, update on all sequences in schema public from anon;

do $$
begin
  raise notice 'anon write grants revoked; SELECT and RPC EXECUTE are unchanged';
end $$;
