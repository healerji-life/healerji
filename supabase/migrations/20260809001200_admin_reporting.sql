-- ============================================================================
-- HealerJi · 0012 · Admin reporting functions  (ADDITIVE — nothing is altered)
-- ----------------------------------------------------------------------------
-- PostgREST cannot GROUP BY, so without these the dashboard would have to pull
-- raw rows to the server and aggregate in JavaScript. That is slow, and it
-- means shipping payment rows to a process that only needs a total.
--
-- Every function here:
--   * is SECURITY DEFINER, and therefore polices itself with is_staff()
--   * returns aggregates only — never a row identifying an individual
--   * is revoked from anon and granted only to authenticated + service_role
-- ============================================================================

-- Net revenue counts captured payments minus whatever has been refunded.
create or replace function public.admin_dashboard_summary(
  range_start timestamptz,
  range_end   timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege: reporting is restricted to staff'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'gross_revenue_paise', coalesce((
      select sum(p.amount_paise) from public.payments p
      where p.status = 'captured' and p.captured_at >= range_start and p.captured_at < range_end
    ), 0),
    'net_revenue_paise', coalesce((
      select sum(p.amount_paise - p.amount_refunded_paise) from public.payments p
      where p.status = 'captured' and p.captured_at >= range_start and p.captured_at < range_end
    ), 0),
    'refunded_paise', coalesce((
      select sum(p.amount_refunded_paise) from public.payments p
      where p.captured_at >= range_start and p.captured_at < range_end
    ), 0),
    'payments_captured', coalesce((
      select count(*) from public.payments p
      where p.status = 'captured' and p.captured_at >= range_start and p.captured_at < range_end
    ), 0),
    'payments_failed', coalesce((
      select count(*) from public.payments p
      where p.status = 'failed' and p.created_at >= range_start and p.created_at < range_end
    ), 0),
    'bookings', coalesce((
      select count(*) from public.bookings b
      where b.created_at >= range_start and b.created_at < range_end
        and b.status in ('confirmed', 'completed')
    ), 0),
    'bookings_cancelled', coalesce((
      select count(*) from public.bookings b
      where b.created_at >= range_start and b.created_at < range_end and b.status = 'cancelled'
    ), 0),
    'upcoming_sessions', coalesce((
      select count(*) from public.bookings b
      where b.starts_at >= now() and b.status = 'confirmed'
    ), 0),
    'active_healers', coalesce((
      select count(*) from public.healers h where h.status = 'active'
    ), 0),
    'healers_accepting', coalesce((
      select count(*) from public.healer_booking_settings s
      join public.healers h on h.id = s.healer_id
      where s.accepting_bookings and h.status = 'active'
    ), 0),
    'customers_total', coalesce((select count(*) from public.profiles), 0),
    'customers_new', coalesce((
      select count(*) from public.profiles pr
      where pr.created_at >= range_start and pr.created_at < range_end
    ), 0),
    'published_articles', coalesce((
      select count(*) from public.articles a
      where a.status = 'published' and (a.published_at is null or a.published_at <= now())
    ), 0),
    'visitors', coalesce((
      select count(distinct pv.visitor_id) from public.page_views pv
      where pv.is_bot = false and pv.entered_at >= range_start and pv.entered_at < range_end
    ), 0),
    'page_views', coalesce((
      select count(*) from public.page_views pv
      where pv.is_bot = false and pv.entered_at >= range_start and pv.entered_at < range_end
    ), 0),
    'sessions', coalesce((
      select count(*) from public.analytics_sessions s
      where s.is_bot = false and s.started_at >= range_start and s.started_at < range_end
    ), 0),
    -- Null rather than 0 when there is no traffic: "no data" and "nobody
    -- converted" are different facts and must not render identically.
    'avg_engagement_ms', (
      select round(avg(nullif(pv.engagement_ms, 0)))::bigint from public.page_views pv
      where pv.is_bot = false and pv.entered_at >= range_start and pv.entered_at < range_end
    ),
    'avg_scroll_pct', (
      select round(avg(pv.max_scroll_pct), 1) from public.page_views pv
      where pv.is_bot = false and pv.entered_at >= range_start and pv.entered_at < range_end
    )
  ) into v;

  return v;
end;
$$;

-- ---------------------------------------------------------------- series ----
create or replace function public.admin_daily_series(
  range_start timestamptz,
  range_end   timestamptz
)
returns table (
  day            date,
  revenue_paise  bigint,
  bookings       bigint,
  visitors       bigint,
  page_views     bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  with days as (
    select generate_series(range_start::date, (range_end - interval '1 day')::date, '1 day')::date as d
  )
  select
    days.d,
    coalesce((
      select sum(p.amount_paise - p.amount_refunded_paise)
      from public.payments p
      where p.status = 'captured' and p.captured_at::date = days.d
    ), 0)::bigint,
    coalesce((
      select count(*) from public.bookings b
      where b.created_at::date = days.d and b.status in ('confirmed', 'completed')
    ), 0)::bigint,
    coalesce((
      select count(distinct pv.visitor_id) from public.page_views pv
      where pv.is_bot = false and pv.entered_at::date = days.d
    ), 0)::bigint,
    coalesce((
      select count(*) from public.page_views pv
      where pv.is_bot = false and pv.entered_at::date = days.d
    ), 0)::bigint
  from days
  order by days.d;
end;
$$;

-- ----------------------------------------------------------- leaderboards ---
create or replace function public.admin_top_healers(
  range_start timestamptz,
  range_end   timestamptz,
  row_limit   integer default 5
)
returns table (
  healer_id     uuid,
  slug          text,
  name          text,
  avatar_url    text,
  bookings      bigint,
  revenue_paise bigint,
  profile_views bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  select
    h.id, h.slug, h.name, h.avatar_url,
    coalesce(bk.n, 0)::bigint,
    coalesce(bk.revenue, 0)::bigint,
    coalesce(ev.n, 0)::bigint
  from public.healers h
  left join lateral (
    select count(*) as n, sum(b.amount_paise) as revenue
    from public.bookings b
    where b.healer_id = h.id
      and b.created_at >= range_start and b.created_at < range_end
      and b.status in ('confirmed', 'completed')
  ) bk on true
  left join lateral (
    select count(*) as n
    from public.analytics_events e
    where e.healer_id = h.id and e.name = 'healer_profile_view'
      and e.occurred_at >= range_start and e.occurred_at < range_end
  ) ev on true
  where h.status = 'active'
  order by coalesce(bk.revenue, 0) desc, coalesce(bk.n, 0) desc, h.display_order
  limit greatest(1, least(50, row_limit));
end;
$$;

create or replace function public.admin_top_articles(
  range_start timestamptz,
  range_end   timestamptz,
  row_limit   integer default 5
)
returns table (
  article_id uuid,
  slug       text,
  title      text,
  views      bigint,
  visitors   bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  select a.id, a.slug, a.title,
         coalesce(v.views, 0)::bigint,
         coalesce(v.visitors, 0)::bigint
  from public.articles a
  left join lateral (
    select count(*) as views, count(distinct pv.visitor_id) as visitors
    from public.page_views pv
    where pv.is_bot = false
      and pv.path = '/blog/' || a.slug
      and pv.entered_at >= range_start and pv.entered_at < range_end
  ) v on true
  where a.status = 'published'
  order by coalesce(v.views, 0) desc, a.published_at desc nulls last
  limit greatest(1, least(50, row_limit));
end;
$$;

-- ------------------------------------------------- one page, in detail ------
-- Backs the drill-down when an admin clicks a row in the pages table.
create or replace function public.admin_page_detail(
  p_route     text,
  range_start timestamptz,
  range_end   timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'route', p_route,
    'views', coalesce((select count(*) from public.page_views pv
       where pv.route = p_route and pv.is_bot = false
         and pv.entered_at >= range_start and pv.entered_at < range_end), 0),
    'visitors', coalesce((select count(distinct pv.visitor_id) from public.page_views pv
       where pv.route = p_route and pv.is_bot = false
         and pv.entered_at >= range_start and pv.entered_at < range_end), 0),
    'avg_engagement_ms', (select round(avg(nullif(pv.engagement_ms, 0)))::bigint
       from public.page_views pv
       where pv.route = p_route and pv.is_bot = false
         and pv.entered_at >= range_start and pv.entered_at < range_end),
    'avg_scroll_pct', (select round(avg(pv.max_scroll_pct), 1) from public.page_views pv
       where pv.route = p_route and pv.is_bot = false
         and pv.entered_at >= range_start and pv.entered_at < range_end),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', d.device_type, 'views', d.n) order by d.n desc)
      from (
        select coalesce(pv.device_type, 'unknown') as device_type, count(*) as n
        from public.page_views pv
        where pv.route = p_route and pv.is_bot = false
          and pv.entered_at >= range_start and pv.entered_at < range_end
        group by 1
      ) d
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', s.referrer_host, 'views', s.n) order by s.n desc)
      from (
        select coalesce(nullif(pv.referrer_host, ''), 'direct') as referrer_host, count(*) as n
        from public.page_views pv
        where pv.route = p_route and pv.is_bot = false
          and pv.entered_at >= range_start and pv.entered_at < range_end
        group by 1 order by 2 desc limit 8
      ) s
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('name', e.name, 'count', e.n) order by e.n desc)
      from (
        select ev.name, count(*) as n
        from public.analytics_events ev
        where ev.route = p_route and ev.is_bot = false
          and ev.occurred_at >= range_start and ev.occurred_at < range_end
        group by 1
      ) e
    ), '[]'::jsonb),
    'bookings_attributed', coalesce((select count(*) from public.bookings b
       where b.source_route = p_route
         and b.created_at >= range_start and b.created_at < range_end
         and b.status in ('confirmed', 'completed')), 0),
    'revenue_paise', coalesce((select sum(b.amount_paise) from public.bookings b
       where b.source_route = p_route
         and b.created_at >= range_start and b.created_at < range_end
         and b.status in ('confirmed', 'completed')), 0)
  ) into v;

  return v;
end;
$$;

-- ------------------------------------------------------------- event totals --
create or replace function public.admin_event_totals(
  range_start timestamptz,
  range_end   timestamptz
)
returns table (name text, total bigint, visitors bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  select e.name, count(*)::bigint, count(distinct e.visitor_id)::bigint
  from public.analytics_events e
  where e.is_bot = false and e.occurred_at >= range_start and e.occurred_at < range_end
  group by e.name
  order by 2 desc;
end;
$$;

-- ------------------------------------------------------------------ grants --
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_dashboard_summary(timestamptz, timestamptz)',
    'public.admin_daily_series(timestamptz, timestamptz)',
    'public.admin_top_healers(timestamptz, timestamptz, integer)',
    'public.admin_top_articles(timestamptz, timestamptz, integer)',
    'public.admin_page_detail(text, timestamptz, timestamptz)',
    'public.admin_event_totals(timestamptz, timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;
