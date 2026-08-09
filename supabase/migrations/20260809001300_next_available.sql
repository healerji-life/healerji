-- ============================================================================
-- HealerJi · 0013 · Next available slot  (ADDITIVE)
-- ----------------------------------------------------------------------------
-- The healer card shows "next available". In the prototype that was a hard-
-- coded string ("Today, 6:30 pm") and the "available today" filter worked by
-- calling startsWith("Today") on it.
--
-- This computes it for real, from the same slot generator the booking calendar
-- uses, so the card cannot promise a time the healer has not opened. A healer
-- with no availability returns NULL, which the UI must render as "no times
-- published" rather than inventing one.
-- ============================================================================

create or replace function public.healer_next_available(
  p_healer_slug    text,
  p_days_ahead     integer default 14,
  p_duration_minutes integer default 45
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz     text;
  v_today  date;
  v_day    date;
  v_slot   timestamptz;
  v_max    integer := least(greatest(coalesce(p_days_ahead, 14), 1), 60);
begin
  select coalesce(s.timezone, h.timezone)
    into v_tz
  from public.healers h
  left join public.healer_booking_settings s on s.healer_id = h.id
  where h.slug = p_healer_slug and h.status = 'active';

  if v_tz is null then return null; end if;

  v_today := (now() at time zone v_tz)::date;

  for i in 0 .. v_max loop
    v_day := v_today + i;
    select min(sl.starts_at) into v_slot
    from public.get_available_slots(p_healer_slug, v_day, p_duration_minutes) sl;
    if v_slot is not null then
      return v_slot;
    end if;
  end loop;

  return null;
end;
$$;

-- Batch form, so the listing page is one round trip rather than one per card.
create or replace function public.healers_next_available(
  p_slugs        text[],
  p_days_ahead   integer default 14
)
returns table (slug text, next_available timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select s.slug, public.healer_next_available(s.slug, p_days_ahead)
  from unnest(coalesce(p_slugs, '{}')) as s(slug);
end;
$$;

grant execute on function public.healer_next_available(text, integer, integer)
  to anon, authenticated, service_role;
grant execute on function public.healers_next_available(text[], integer)
  to anon, authenticated, service_role;

comment on function public.healers_next_available is
  'Returns NULL for a healer with no open slots. Callers must render that as "no times published", never as a guess.';
