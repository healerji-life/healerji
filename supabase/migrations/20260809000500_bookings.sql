-- ============================================================================
-- HealerJi · 0005 · Bookings
-- ----------------------------------------------------------------------------
-- Replaces lib/booking/store.ts (localStorage). The reference format HJ-XXXXXX
-- is preserved so anything already issued still reads the same.
--
-- Double-booking (requirement 28) is prevented by a GiST EXCLUDE constraint,
-- not by a read-then-write check in application code. Two concurrent
-- transactions inserting overlapping rows for the same healer: one commits,
-- the other fails with SQLSTATE 23P01. There is no interleaving that lets
-- both through.
-- ============================================================================

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique,

  -- Null for a guest checkout; linked on account creation.
  customer_id  uuid references public.profiles (id) on delete set null,
  healer_id    uuid not null references public.healers (id) on delete restrict,
  offering_id  uuid references public.session_offerings (id) on delete set null,

  session_kind     public.session_kind not null,
  duration_minutes smallint not null check (duration_minutes between 15 and 180),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  -- starts_at .. ends_at plus the healer's buffer. This is what the overlap
  -- constraint actually tests, so back-to-back bookings respect the buffer.
  blocks_until     timestamptz not null,

  amount_paise integer not null check (amount_paise >= 0),
  currency     char(3) not null default 'INR',

  status         public.booking_status         not null default 'pending_payment',
  payment_status public.booking_payment_status not null default 'unpaid',

  -- Guest details, captured at checkout. Mirrors the existing form fields.
  guest_name  text,
  guest_email extensions.citext,
  guest_phone text,

  customer_note text,
  healer_note   text,          -- private to the healer and admins

  -- A pending_payment row holds the slot only until this moment.
  hold_expires_at timestamptz,

  -- Attribution, so "bookings attributed to page" in analytics is a real
  -- join and not an estimate (requirement 13).
  source_path        text,
  source_route       text,
  analytics_session_id uuid,

  cancelled_at        timestamptz,
  cancelled_by        uuid references public.profiles (id) on delete set null,
  cancellation_reason text,
  completed_at        timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_time_order   check (ends_at > starts_at),
  constraint bookings_block_covers check (blocks_until >= ends_at),
  constraint bookings_identified   check (customer_id is not null or guest_email is not null)
);

create index if not exists bookings_healer_start_idx on public.bookings (healer_id, starts_at);
create index if not exists bookings_customer_idx     on public.bookings (customer_id, starts_at desc);
create index if not exists bookings_status_idx       on public.bookings (status, starts_at);
create index if not exists bookings_created_idx      on public.bookings (created_at desc);
create index if not exists bookings_route_idx        on public.bookings (source_route) where source_route is not null;
create index if not exists bookings_guest_email_idx  on public.bookings (guest_email);
create index if not exists bookings_hold_idx         on public.bookings (hold_expires_at)
  where status = 'pending_payment';

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------ the anti-double-booking --
-- Only live rows reserve time. Cancelled / expired / no-show rows do not, so
-- a released slot immediately becomes bookable again.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    healer_id with =,
    tstzrange(starts_at, blocks_until, '[)') with &&
  )
  where (status in ('pending_payment', 'confirmed', 'completed'));

comment on constraint bookings_no_overlap on public.bookings is
  'Requirement 28. Concurrent conflicting inserts raise SQLSTATE 23P01; the loser must be surfaced to the user as "that slot was just taken".';

-- ------------------------------------------------------------- reference ---
create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
as $$
declare
  -- No I, O, 0 or 1: this gets read aloud on support calls.
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt   integer := 0;
begin
  loop
    candidate := 'HJ-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.bookings b where b.reference = candidate);
    attempt := attempt + 1;
    if attempt > 25 then
      raise exception 'could not allocate a unique booking reference';
    end if;
  end loop;
  return candidate;
end;
$$;

alter table public.bookings
  alter column reference set default public.generate_booking_reference();

-- ----------------------------------------------------- expiring stale holds --
-- Called by a scheduled job (pg_cron) and defensively before slot generation.
create or replace function public.expire_stale_booking_holds()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  update public.bookings
     set status = 'expired',
         payment_status = case when payment_status = 'unpaid' then 'unpaid' else payment_status end
   where status = 'pending_payment'
     and hold_expires_at is not null
     and hold_expires_at < now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ----------------------------------------------------- booking status log --
create table if not exists public.booking_events (
  id          bigserial primary key,
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status   public.booking_status not null,
  actor_id    uuid references public.profiles (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists booking_events_booking_idx on public.booking_events (booking_id, created_at);

create or replace function public.log_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.booking_events (booking_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_log_status on public.bookings;
create trigger bookings_log_status
  after insert or update of status on public.bookings
  for each row execute function public.log_booking_status_change();
