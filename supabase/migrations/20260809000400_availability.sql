-- ============================================================================
-- HealerJi · 0004 · Healer-controlled availability
-- ----------------------------------------------------------------------------
-- Replaces the deterministic hash-based slot generator in
-- lib/booking/availability.ts. Slots are now a function of:
--   weekly rules + dated exceptions + booking settings + existing bookings.
-- ============================================================================

create table if not exists public.healer_booking_settings (
  healer_id             uuid primary key references public.healers (id) on delete cascade,
  timezone              text     not null default 'Asia/Kolkata',
  -- Slot grid granularity. Offerings may be longer than this.
  slot_interval_minutes smallint not null default 30
                          check (slot_interval_minutes in (15, 20, 30, 45, 60)),
  buffer_minutes        smallint not null default 15 check (buffer_minutes between 0 and 120),
  min_notice_minutes    integer  not null default 120 check (min_notice_minutes between 0 and 20160),
  max_advance_days      smallint not null default 60  check (max_advance_days between 1 and 365),
  -- Hard ceiling on sessions per day, independent of open slots. 0 = no cap.
  max_sessions_per_day  smallint not null default 0 check (max_sessions_per_day >= 0),
  accepting_bookings    boolean  not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists healer_booking_settings_set_updated_at on public.healer_booking_settings;
create trigger healer_booking_settings_set_updated_at
  before update on public.healer_booking_settings
  for each row execute function public.set_updated_at();

comment on column public.healer_booking_settings.timezone is
  'IANA zone. All weekly rules below are expressed as wall-clock times in this zone.';

-- ------------------------------------------------------ weekly recurrence --
-- "Monday 09:00-13:00 and 14:00-18:00" is two rows.
create table if not exists public.healer_availability_rules (
  id             uuid primary key default gen_random_uuid(),
  healer_id      uuid not null references public.healers (id) on delete cascade,
  -- 0 = Sunday .. 6 = Saturday, matching JS getDay() and Postgres EXTRACT(DOW).
  weekday        smallint not null check (weekday between 0 and 6),
  start_time     time not null,
  end_time       time not null,
  effective_from date,
  effective_to   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint availability_rule_order check (end_time > start_time),
  constraint availability_rule_dates check (
    effective_from is null or effective_to is null or effective_to >= effective_from
  )
);

create index if not exists availability_rules_healer_idx
  on public.healer_availability_rules (healer_id, weekday);

-- Two overlapping windows on the same weekday would double-count a slot.
alter table public.healer_availability_rules
  drop constraint if exists availability_rules_no_overlap;
alter table public.healer_availability_rules
  add constraint availability_rules_no_overlap
  exclude using gist (
    healer_id with =,
    weekday   with =,
    public.timerange(start_time, end_time, '[)') with &&
  );

drop trigger if exists availability_rules_set_updated_at on public.healer_availability_rules;
create trigger availability_rules_set_updated_at
  before update on public.healer_availability_rules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------- dated exceptions -----
-- 'unavailable' = holiday, vacation, a blocked afternoon.
-- 'extra'       = a one-off window outside the weekly pattern.
-- A null time range on an 'unavailable' row means the whole day is off.
create table if not exists public.availability_exceptions (
  id          uuid primary key default gen_random_uuid(),
  healer_id   uuid not null references public.healers (id) on delete cascade,
  kind        public.availability_exception_kind not null,
  on_date     date not null,
  start_time  time,
  end_time    time,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint exception_time_pairing check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  ),
  constraint exception_extra_needs_time check (
    kind <> 'extra' or (start_time is not null and end_time is not null)
  )
);

create index if not exists availability_exceptions_lookup_idx
  on public.availability_exceptions (healer_id, on_date);

-- ------------------------------------------------------------- breaks ------
-- Recurring daily breaks (lunch, evening prayer) applied on top of rules.
create table if not exists public.healer_breaks (
  id         uuid primary key default gen_random_uuid(),
  healer_id  uuid not null references public.healers (id) on delete cascade,
  label      text,
  -- Null weekday = every day the healer works.
  weekday    smallint check (weekday is null or weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  constraint break_order check (end_time > start_time)
);

create index if not exists healer_breaks_healer_idx on public.healer_breaks (healer_id);
