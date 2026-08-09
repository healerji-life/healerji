-- ============================================================================
-- HealerJi · 0008 · First-party analytics
-- ----------------------------------------------------------------------------
-- Privacy posture (requirement 54): no raw IP is stored. `visitor_id` is a
-- rotating, salted hash produced server-side; it identifies a browser for
-- deduplication within a reporting window and cannot be reversed to a person.
-- user_id is recorded only so that "which of my customers booked" is
-- answerable; it is never surfaced in the page-engagement reports.
--
-- `route` is the Next.js route pattern (/healers/[slug]); `path` is the
-- concrete URL (/healers/meera-krishnan). Requirement 13 needs both.
-- ============================================================================

create table if not exists public.analytics_sessions (
  id             uuid primary key default gen_random_uuid(),
  visitor_id     text not null,
  user_id        uuid references public.profiles (id) on delete set null,

  started_at     timestamptz not null default now(),
  last_event_at  timestamptz not null default now(),
  ended_at       timestamptz,

  entry_path     text,
  entry_route    text,
  exit_path      text,

  page_view_count integer not null default 0,
  event_count     integer not null default 0,
  engagement_ms   integer not null default 0,

  referrer_host  text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,

  device_type    text check (device_type in ('desktop', 'tablet', 'mobile', 'unknown')),
  browser        text,
  os             text,
  country        text,        -- 2-letter, from the edge header. No city, no IP.
  is_bot         boolean not null default false
);

create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions (visitor_id, started_at desc);
create index if not exists analytics_sessions_started_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_user_idx    on public.analytics_sessions (user_id) where user_id is not null;

-- ----------------------------------------------------------- page views ----
create table if not exists public.page_views (
  id          bigserial primary key,
  session_id  uuid references public.analytics_sessions (id) on delete cascade,
  visitor_id  text not null,
  user_id     uuid references public.profiles (id) on delete set null,

  path        text not null,
  route       text not null,
  title       text,
  referrer_host text,

  entered_at  timestamptz not null default now(),
  exited_at   timestamptz,
  -- Time the tab was actually visible and the page focused, not wall time.
  engagement_ms  integer not null default 0 check (engagement_ms >= 0),
  max_scroll_pct smallint not null default 0 check (max_scroll_pct between 0 and 100),

  device_type text check (device_type in ('desktop', 'tablet', 'mobile', 'unknown')),
  country     text,
  is_bot      boolean not null default false
);

create index if not exists page_views_route_time_idx on public.page_views (route, entered_at desc);
create index if not exists page_views_path_time_idx  on public.page_views (path, entered_at desc);
create index if not exists page_views_time_idx       on public.page_views (entered_at desc);
create index if not exists page_views_session_idx    on public.page_views (session_id);

-- --------------------------------------------------------------- events ----
-- Event names are validated in TypeScript (lib/analytics/events.ts) rather
-- than by a CHECK constraint, so adding an event is not a migration.
create table if not exists public.analytics_events (
  id          bigserial primary key,
  session_id  uuid references public.analytics_sessions (id) on delete cascade,
  visitor_id  text not null,
  user_id     uuid references public.profiles (id) on delete set null,

  name        text not null,
  path        text,
  route       text,
  properties  jsonb not null default '{}'::jsonb,

  -- Denormalised links so revenue and healer attribution are plain joins.
  healer_id   uuid references public.healers (id) on delete set null,
  article_id  uuid references public.articles (id) on delete set null,
  booking_id  uuid references public.bookings (id) on delete set null,

  occurred_at timestamptz not null default now(),
  is_bot      boolean not null default false
);

create index if not exists analytics_events_name_time_idx on public.analytics_events (name, occurred_at desc);
create index if not exists analytics_events_route_idx     on public.analytics_events (route, occurred_at desc);
create index if not exists analytics_events_healer_idx    on public.analytics_events (healer_id) where healer_id is not null;
create index if not exists analytics_events_props_idx     on public.analytics_events using gin (properties);
create index if not exists analytics_events_time_idx      on public.analytics_events (occurred_at desc);

-- --------------------------------------------------- daily rollup ----------
-- Reporting reads this, not the raw tables. Refreshed on a schedule; the
-- admin UI shows the refresh timestamp so nobody mistakes it for live data.
drop materialized view if exists public.page_analytics_daily;
create materialized view public.page_analytics_daily as
select
  date_trunc('day', pv.entered_at)                as day,
  pv.route,
  pv.device_type,
  count(*)                                        as views,
  count(distinct pv.visitor_id)                   as visitors,
  count(distinct pv.session_id)                   as sessions,
  coalesce(avg(nullif(pv.engagement_ms, 0)), 0)::integer as avg_engagement_ms,
  coalesce(avg(pv.max_scroll_pct), 0)::numeric(5,2)      as avg_scroll_pct
from public.page_views pv
where pv.is_bot = false
group by 1, 2, 3;

create unique index if not exists page_analytics_daily_key
  on public.page_analytics_daily (day, route, device_type);

create or replace function public.refresh_analytics_rollups()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  refresh materialized view concurrently public.page_analytics_daily;
exception when others then
  -- CONCURRENTLY requires a prior non-concurrent populate; fall back once.
  refresh materialized view public.page_analytics_daily;
end;
$$;

revoke execute on function public.refresh_analytics_rollups() from public, anon, authenticated;
grant  execute on function public.refresh_analytics_rollups() to service_role;

-- ------------------------------------- page engagement, on demand ----------
-- Requirement 13: one row per page for a date range, including CTA clicks,
-- booking starts and bookings actually attributed to that page.
create or replace function public.page_engagement_report(
  range_start timestamptz,
  range_end   timestamptz,
  device      text default null
)
returns table (
  route              text,
  views              bigint,
  visitors           bigint,
  sessions           bigint,
  avg_engagement_ms  integer,
  avg_scroll_pct     numeric,
  cta_clicks         bigint,
  booking_starts     bigint,
  bookings_attributed bigint,
  revenue_paise      bigint,
  conversion_rate    numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- SECURITY DEFINER bypasses RLS, so this function must police itself.
  -- Granting to `authenticated` alone would expose analytics to every
  -- signed-in customer.
  if not public.is_staff() then
    raise exception 'insufficient_privilege: analytics is restricted to staff'
      using errcode = '42501';
  end if;

  return query
  with views as (
    select pv.route,
           count(*)                          as views,
           count(distinct pv.visitor_id)     as visitors,
           count(distinct pv.session_id)     as sessions,
           coalesce(avg(nullif(pv.engagement_ms, 0)), 0)::integer as avg_engagement_ms,
           coalesce(avg(pv.max_scroll_pct), 0)::numeric(5,2)      as avg_scroll_pct
    from public.page_views pv
    where pv.is_bot = false
      and pv.entered_at >= range_start and pv.entered_at < range_end
      and (device is null or pv.device_type = device)
    group by pv.route
  ),
  ev as (
    select e.route,
           count(*) filter (where e.name = 'cta_click')     as cta_clicks,
           count(*) filter (where e.name = 'booking_start') as booking_starts
    from public.analytics_events e
    where e.is_bot = false
      and e.occurred_at >= range_start and e.occurred_at < range_end
      and e.route is not null
    group by e.route
  ),
  bk as (
    select b.source_route as route,
           count(*)                     as bookings_attributed,
           sum(b.amount_paise)::bigint  as revenue_paise
    from public.bookings b
    where b.source_route is not null
      and b.created_at >= range_start and b.created_at < range_end
      and b.status in ('confirmed', 'completed')
    group by b.source_route
  )
  select
    v.route,
    v.views,
    v.visitors,
    v.sessions,
    v.avg_engagement_ms,
    v.avg_scroll_pct,
    coalesce(ev.cta_clicks, 0),
    coalesce(ev.booking_starts, 0),
    coalesce(bk.bookings_attributed, 0),
    coalesce(bk.revenue_paise, 0),
    case when v.visitors > 0
         then round((coalesce(bk.bookings_attributed, 0)::numeric / v.visitors) * 100, 2)
         else 0 end
  from views v
  left join ev on ev.route = v.route
  left join bk on bk.route = v.route
  order by v.views desc;
end;
$$;

revoke execute on function public.page_engagement_report(timestamptz, timestamptz, text) from public, anon;
grant  execute on function public.page_engagement_report(timestamptz, timestamptz, text) to authenticated, service_role;

comment on function public.page_engagement_report is
  'SECURITY DEFINER: aggregates only, never returns a row identifying an individual. Authorisation is enforced inside the function body via is_staff(), not by the caller.';
