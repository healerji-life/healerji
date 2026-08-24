-- ============================================================ rate limiting ==
-- HJ-04 / HJ-05: nothing in the application was rate limited. An anonymous
-- caller could inject unlimited registry-valid analytics events (inflating the
-- revenue funnel), and every accepted POST to /api/contact or /api/healer-apply
-- sent an email with no cap.
--
-- Why Postgres and not Redis: the alternative is a new external service with
-- new credentials, for a counter that must be atomic across serverless
-- instances. Postgres already is that, it is already on the request path for
-- these endpoints, and `insert ... on conflict do update ... returning` is a
-- single atomic round trip. An in-memory limiter would be worse than none: it
-- would pass review while doing nothing across instances.
--
-- The window is fixed, not sliding. A fixed window can admit up to 2x the limit
-- across a boundary; for abuse protection that is an acceptable trade for one
-- round trip and no background sweeper.

create table if not exists public.rate_limits (
  -- Caller-scoped key, e.g. 'analytics:203.0.113.7' or 'contact:a@b.com'.
  bucket       text        not null check (length(bucket) between 1 and 200),
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket, window_start)
);

-- Old windows are dead weight; this supports the opportunistic sweep below.
create index if not exists rate_limits_window_idx
  on public.rate_limits (window_start);

-- ------------------------------------------------------------------ RLS ----
-- No policies at all, deliberately. Nothing may read or write this table
-- directly; the only access is through consume_rate_limit(), which is SECURITY
-- DEFINER. A client that could read it would learn other visitors' request
-- volumes, and one that could write it could reset its own counter.
alter table public.rate_limits enable row level security;

-- ------------------------------------------------------------- the counter --
-- Returns jsonb rather than a composite so adding a field later does not
-- change the function signature, matching create_booking_hold().
create or replace function public.consume_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  if p_bucket is null or length(btrim(p_bucket)) = 0 then
    raise exception 'bucket_required' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid_window' using errcode = '22023';
  end if;

  -- Floor now() to the start of the current fixed window.
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  -- Atomic: concurrent callers serialise on the primary key, so the returned
  -- count is exact even under parallel requests from the same caller.
  insert into public.rate_limits as rl (bucket, window_start, count)
  values (left(p_bucket, 200), v_window_start, 1)
  on conflict (bucket, window_start)
  do update set count = rl.count + 1
  returning rl.count into v_count;

  -- Opportunistic sweep, ~1 call in 200, so the table cannot grow without
  -- bound and no scheduled job is required.
  if random() < 0.005 then
    delete from public.rate_limits
    where window_start < clock_timestamp() - make_interval(secs => p_window_seconds * 5);
  end if;

  return jsonb_build_object(
    'allowed',     v_count <= p_limit,
    'count',       v_count,
    'limit',       p_limit,
    'remaining',   greatest(p_limit - v_count, 0),
    'retry_after', greatest(
      ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer,
      1
    )
  );
end;
$$;

comment on function public.consume_rate_limit is
  'Atomically increments a fixed-window counter and reports whether the caller is within the limit. The only access path to public.rate_limits, which has RLS on and no policies.';

-- Only the server ever calls this. The endpoints it protects are public, but
-- they run server-side with the service role, so anon needs no grant — and
-- withholding it means a browser cannot burn a caller's own quota or probe
-- another visitor's usage.
revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
