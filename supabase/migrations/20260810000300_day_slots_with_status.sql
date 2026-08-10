-- ===================================================== get_day_slots ========
-- Every slot in a healer's published window for a date, each with a status,
-- rather than only the ones that happen to be free.
--
-- get_available_slots() returns open times only, so a taken slot simply
-- disappears and the calendar cannot tell a customer why. "Fully booked" and
-- "not working that day" look identical, and a customer choosing between two
-- dates has nothing to compare.
--
-- This does not replace get_available_slots(). That function stays exactly as
-- it is and remains what the booking path trusts: a slot is bookable only if
-- it comes back from there, and bookings_no_overlap is what actually prevents
-- a double booking. This one is for rendering.
--
-- Statuses:
--   available  open, and far enough ahead to satisfy the notice period
--   booked     a live booking overlaps it, buffer included
--   blocked    a recurring break or a dated part-day absence covers it
--   past       inside the minimum-notice window, so no longer offerable
--
-- Callers that must not disclose a healer's calendar should collapse booked
-- and blocked into one "unavailable" before the result reaches a browser.
-- Booking volume is commercially sensitive and a session time is personal.

create or replace function public.get_day_slots(
  p_healer_slug      text,
  p_date             date,
  p_duration_minutes integer default 45
)
returns table (starts_at timestamptz, ends_at timestamptz, status text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_healer      public.healers%rowtype;
  v_tz          text;
  v_interval    integer;
  v_buffer      integer;
  v_min_notice  integer;
  v_max_advance integer;
  v_accepting   boolean;
  v_today       date;
  v_dow         smallint;
begin
  if p_duration_minutes is null or p_duration_minutes < 15 or p_duration_minutes > 180 then
    return;
  end if;

  select * into v_healer
  from public.healers h
  where h.slug = p_healer_slug and h.status = 'active';
  if not found then return; end if;

  select coalesce(s.timezone, v_healer.timezone), s.slot_interval_minutes, s.buffer_minutes,
         s.min_notice_minutes, s.max_advance_days, s.accepting_bookings
    into v_tz, v_interval, v_buffer, v_min_notice, v_max_advance, v_accepting
  from public.healer_booking_settings s
  where s.healer_id = v_healer.id;

  if not found then
    v_tz := v_healer.timezone; v_interval := 30; v_buffer := 15;
    v_min_notice := 120; v_max_advance := 60; v_accepting := true;
  end if;

  if not v_accepting then return; end if;

  v_today := (now() at time zone v_tz)::date;
  if p_date < v_today or p_date > (v_today + v_max_advance) then
    return;
  end if;

  v_dow := extract(dow from p_date)::smallint;

  return query
  with windows as (
    select r.start_time, r.end_time
    from public.healer_availability_rules r
    where r.healer_id = v_healer.id
      and r.weekday = v_dow
      and (r.effective_from is null or r.effective_from <= p_date)
      and (r.effective_to   is null or r.effective_to   >= p_date)
    union all
    select e.start_time, e.end_time
    from public.availability_exceptions e
    where e.healer_id = v_healer.id and e.on_date = p_date and e.kind = 'extra'
      and e.start_time is not null and e.end_time is not null
  ),
  day_off as (
    select 1
    from public.availability_exceptions e
    where e.healer_id = v_healer.id and e.on_date = p_date
      and e.kind = 'unavailable' and e.start_time is null
  ),
  candidates as (
    select distinct
      (w.start_time + make_interval(mins => g.n))                      as local_start,
      (w.start_time + make_interval(mins => g.n + p_duration_minutes)) as local_end
    from windows w
    cross join lateral generate_series(
      0,
      (extract(epoch from (w.end_time - w.start_time)) / 60)::int - p_duration_minutes,
      v_interval
    ) as g(n)
    -- A whole day off publishes nothing at all: the healer is not working,
    -- which is different from working and being full.
    where not exists (select 1 from day_off)
  ),
  resolved as (
    select
      ((p_date::timestamp + c.local_start) at time zone v_tz) as s_start,
      ((p_date::timestamp + c.local_end)   at time zone v_tz) as s_end,
      exists (
        select 1 from public.healer_breaks br
        where br.healer_id = v_healer.id
          and (br.weekday is null or br.weekday = v_dow)
          and public.timerange(br.start_time, br.end_time, '[)')
           && public.timerange(c.local_start, c.local_end, '[)')
      )
      or exists (
        select 1 from public.availability_exceptions ex
        where ex.healer_id = v_healer.id and ex.on_date = p_date
          and ex.kind = 'unavailable' and ex.start_time is not null
          and public.timerange(ex.start_time, ex.end_time, '[)')
           && public.timerange(c.local_start, c.local_end, '[)')
      ) as is_blocked
    from candidates c
  )
  select
    r.s_start,
    r.s_end,
    case
      when r.s_start < now() + make_interval(mins => v_min_notice) then 'past'
      when exists (
        select 1 from public.bookings bk
        where bk.healer_id = v_healer.id
          and bk.status in ('pending_payment', 'confirmed', 'completed')
          and (bk.status <> 'pending_payment'
               or bk.hold_expires_at is null
               or bk.hold_expires_at > now())
          and tstzrange(bk.starts_at, bk.blocks_until, '[)')
           && tstzrange(r.s_start, r.s_end + make_interval(mins => v_buffer), '[)')
      ) then 'booked'
      when r.is_blocked then 'blocked'
      else 'available'
    end as status
  from resolved r
  order by r.s_start;
end;
$$;

comment on function public.get_day_slots(text, date, integer) is
  'Every published slot for a date with its status. Rendering only — '
  'get_available_slots() remains the bookable set, and bookings_no_overlap '
  'is what prevents a double booking.';

revoke all on function public.get_day_slots(text, date, integer) from public;
grant execute on function public.get_day_slots(text, date, integer)
  to anon, authenticated, service_role;
