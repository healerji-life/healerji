-- ============================================================================
-- HealerJi · 0011 · Slot generation and atomic booking holds
-- ----------------------------------------------------------------------------
-- Requirement 27: the public calendar's slots are computed from real data.
-- Requirement 28: two people cannot take the same slot.
--
-- Both functions are SECURITY DEFINER because the availability tables are not
-- publicly readable — a visitor learns which times are free, and nothing else
-- about the healer's schedule, holidays or reasons for absence.
-- ============================================================================

create or replace function public.get_available_slots(
  p_healer_slug      text,
  p_date             date,
  p_duration_minutes integer default 45
)
returns table (starts_at timestamptz, ends_at timestamptz)
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
  v_max_per_day smallint;
  v_accepting   boolean;
  v_today       date;
  v_day_start   timestamptz;
  v_day_end     timestamptz;
  v_booked      integer;
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
         s.min_notice_minutes, s.max_advance_days, s.max_sessions_per_day, s.accepting_bookings
    into v_tz, v_interval, v_buffer, v_min_notice, v_max_advance, v_max_per_day, v_accepting
  from public.healer_booking_settings s
  where s.healer_id = v_healer.id;

  if not found then
    -- A healer with no settings row yet uses platform defaults rather than
    -- silently showing nothing.
    v_tz := v_healer.timezone; v_interval := 30; v_buffer := 15;
    v_min_notice := 120; v_max_advance := 60; v_max_per_day := 0; v_accepting := true;
  end if;

  if not v_accepting then return; end if;

  v_today := (now() at time zone v_tz)::date;
  if p_date < v_today or p_date > (v_today + v_max_advance) then
    return;                                   -- outside the booking window
  end if;

  v_day_start := (p_date::timestamp) at time zone v_tz;
  v_day_end   := ((p_date + 1)::timestamp) at time zone v_tz;
  v_dow       := extract(dow from p_date)::smallint;

  if v_max_per_day > 0 then
    select count(*) into v_booked
    from public.bookings b
    where b.healer_id = v_healer.id
      and b.status in ('pending_payment', 'confirmed', 'completed')
      and b.starts_at >= v_day_start and b.starts_at < v_day_end;
    if v_booked >= v_max_per_day then return; end if;
  end if;

  return query
  with windows as (
    -- the weekly pattern...
    select r.start_time, r.end_time
    from public.healer_availability_rules r
    where r.healer_id = v_healer.id
      and r.weekday = v_dow
      and (r.effective_from is null or r.effective_from <= p_date)
      and (r.effective_to   is null or r.effective_to   >= p_date)
    union all
    -- ...plus any one-off window opened for this specific date
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
    where not exists (select 1 from day_off)
  ),
  usable as (
    select c.local_start, c.local_end
    from candidates c
    -- recurring breaks
    where not exists (
      select 1 from public.healer_breaks br
      where br.healer_id = v_healer.id
        and (br.weekday is null or br.weekday = v_dow)
        and public.timerange(br.start_time, br.end_time, '[)')
         && public.timerange(c.local_start, c.local_end, '[)')
    )
    -- dated part-day absences
    and not exists (
      select 1 from public.availability_exceptions ex
      where ex.healer_id = v_healer.id and ex.on_date = p_date
        and ex.kind = 'unavailable' and ex.start_time is not null
        and public.timerange(ex.start_time, ex.end_time, '[)')
         && public.timerange(c.local_start, c.local_end, '[)')
    )
  )
  select u_start, u_end
  from (
    select ((p_date::timestamp + u.local_start) at time zone v_tz) as u_start,
           ((p_date::timestamp + u.local_end)   at time zone v_tz) as u_end
    from usable u
  ) s
  -- minimum notice
  where s.u_start >= now() + make_interval(mins => v_min_notice)
  -- and nothing already booked, buffer included on both sides
  and not exists (
    select 1 from public.bookings bk
    where bk.healer_id = v_healer.id
      and bk.status in ('pending_payment', 'confirmed', 'completed')
      and (bk.status <> 'pending_payment'
           or bk.hold_expires_at is null
           or bk.hold_expires_at > now())
      and tstzrange(bk.starts_at, bk.blocks_until, '[)')
       && tstzrange(s.u_start, s.u_end + make_interval(mins => v_buffer), '[)')
  )
  order by s.u_start;
end;
$$;

grant execute on function public.get_available_slots(text, date, integer)
  to anon, authenticated, service_role;

-- ============================================================================
-- Price resolution — server-side, always. The client never supplies an amount.
-- ============================================================================
create or replace function public.resolve_session_price(
  p_healer_id        uuid,
  p_kind             public.session_kind,
  p_duration_minutes integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_price integer;
  v_base  integer;
begin
  select so.price_paise into v_price
  from public.session_offerings so
  where so.healer_id = p_healer_id
    and so.kind = p_kind
    and so.duration_minutes = p_duration_minutes
    and so.active
  limit 1;

  if v_price is not null then return v_price; end if;

  -- Fallback preserves the existing pro-rata rule in app/api/checkout:
  -- the healer's base rate is for 45 minutes.
  select h.price_paise into v_base from public.healers h where h.id = p_healer_id;
  if v_base is null then return null; end if;
  return round((v_base::numeric * p_duration_minutes) / 45)::integer;
end;
$$;

-- ============================================================================
-- The atomic hold.
--
-- The INSERT is the availability check. There is no read-then-write window,
-- so two simultaneous callers cannot both succeed: the exclusion constraint
-- makes the second one fail with 23P01, which is translated into an error the
-- UI can show as "that time was just taken".
-- ============================================================================
create or replace function public.create_booking_hold(
  p_healer_slug      text,
  p_session_kind     public.session_kind,
  p_starts_at        timestamptz,
  p_duration_minutes integer,
  p_guest_name       text default null,
  p_guest_email      text default null,
  p_guest_phone      text default null,
  p_customer_note    text default null,
  p_source_path      text default null,
  p_source_route     text default null,
  p_hold_minutes     integer default 15
)
-- Returns jsonb rather than a composite on purpose: OUT parameters named
-- `reference` / `amount_paise` / `hold_expires_at` would shadow the identically
-- named columns of public.bookings inside this body, and plpgsql's default
-- variable_conflict = error would make that a runtime failure.
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_healer   public.healers%rowtype;
  v_buffer   integer;
  v_amount   integer;
  v_offering uuid;
  v_ends     timestamptz;
  v_blocks   timestamptz;
  v_expires  timestamptz;
  v_customer uuid := auth.uid();
  v_email    extensions.citext;
  v_row      public.bookings%rowtype;
  v_ok       boolean;
begin
  if p_duration_minutes is null or p_duration_minutes < 15 or p_duration_minutes > 180 then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  select * into v_healer
  from public.healers h
  where h.slug = p_healer_slug and h.status = 'active';
  if not found then
    raise exception 'healer_not_found' using errcode = 'P0002';
  end if;

  -- The healer must actually offer this session kind.
  if not exists (
    select 1 from public.session_offerings so
    where so.healer_id = v_healer.id and so.kind = p_session_kind and so.active
  ) then
    raise exception 'session_kind_unavailable' using errcode = '22023';
  end if;

  -- Re-derive availability from the same function the calendar used. This is
  -- belt-and-braces: the exclusion constraint below is what actually
  -- guarantees correctness, but this produces a clearer error for the common
  -- case of a stale calendar.
  select exists (
    select 1 from public.get_available_slots(p_healer_slug, (p_starts_at at time zone
      coalesce((select s.timezone from public.healer_booking_settings s where s.healer_id = v_healer.id),
               v_healer.timezone))::date, p_duration_minutes) sl
    where sl.starts_at = p_starts_at
  ) into v_ok;

  if not v_ok then
    raise exception 'slot_unavailable' using errcode = '23514';
  end if;

  select coalesce(s.buffer_minutes, 15) into v_buffer
  from public.healer_booking_settings s where s.healer_id = v_healer.id;
  v_buffer := coalesce(v_buffer, 15);

  v_amount := public.resolve_session_price(v_healer.id, p_session_kind, p_duration_minutes);
  if v_amount is null then
    raise exception 'price_unavailable' using errcode = '22023';
  end if;

  select so.id into v_offering
  from public.session_offerings so
  where so.healer_id = v_healer.id and so.kind = p_session_kind
    and so.duration_minutes = p_duration_minutes and so.active
  limit 1;

  v_ends    := p_starts_at + make_interval(mins => p_duration_minutes);
  v_blocks  := v_ends + make_interval(mins => v_buffer);
  v_expires := now() + make_interval(mins => greatest(5, least(60, coalesce(p_hold_minutes, 15))));

  v_email := coalesce(
    nullif(p_guest_email, '')::extensions.citext,
    (select p.email from public.profiles p where p.id = v_customer)
  );
  if v_email is null then
    raise exception 'contact_email_required' using errcode = '22023';
  end if;

  begin
    insert into public.bookings (
      customer_id, healer_id, offering_id, session_kind, duration_minutes,
      starts_at, ends_at, blocks_until, amount_paise, currency,
      status, payment_status,
      guest_name, guest_email, guest_phone, customer_note,
      hold_expires_at, source_path, source_route
    ) values (
      v_customer, v_healer.id, v_offering, p_session_kind, p_duration_minutes,
      p_starts_at, v_ends, v_blocks, v_amount, v_healer.currency,
      'pending_payment', 'unpaid',
      nullif(p_guest_name, ''), v_email, nullif(p_guest_phone, ''), nullif(p_customer_note, ''),
      v_expires, p_source_path, p_source_route
    )
    returning * into v_row;
  exception
    when exclusion_violation then
      -- SQLSTATE 23P01. Somebody else committed an overlapping booking
      -- between the check above and this insert. This is the race the
      -- constraint exists to lose safely.
      raise exception 'slot_taken' using errcode = '23P01';
  end;

  return jsonb_build_object(
    'booking_id',      v_row.id,
    'reference',       v_row.reference,
    'amount_paise',    v_row.amount_paise,
    'currency',        v_row.currency,
    'starts_at',       v_row.starts_at,
    'ends_at',         v_row.ends_at,
    'hold_expires_at', v_row.hold_expires_at
  );
end;
$$;

grant execute on function public.create_booking_hold(
  text, public.session_kind, timestamptz, integer, text, text, text, text, text, text, integer
) to anon, authenticated, service_role;

grant execute on function public.resolve_session_price(uuid, public.session_kind, integer)
  to service_role;

comment on function public.create_booking_hold is
  'Creates a pending_payment booking that reserves the slot. The amount is computed here from the healer''s own pricing; a client-supplied amount is never accepted.';
