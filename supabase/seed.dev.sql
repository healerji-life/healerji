-- ============================================================================
-- HealerJi · LOCAL DEVELOPMENT ONLY — do not run against production
-- ----------------------------------------------------------------------------
-- supabase/seed.sql deliberately creates no availability, because inventing a
-- schedule would let a real customer book a time no healer agreed to.
--
-- This file exists so the booking calendar can be exercised locally. It opens
-- every seeded healer Mon-Sat, 09:00-13:00 and 14:00-18:00, with a 13:00 break
-- already implied by the gap.
--
--   psql "$LOCAL_DB_URL" -f supabase/seed.dev.sql
-- ============================================================================

do $$
begin
  if current_setting('server_version_num')::int > 0
     and coalesce(current_setting('app.environment', true), 'development') = 'production' then
    raise exception 'refusing to run development seed against production';
  end if;
end $$;

begin;

insert into public.healer_availability_rules (healer_id, weekday, start_time, end_time)
select h.id, d.weekday, w.start_time, w.end_time
from public.healers h
cross join (values (1), (2), (3), (4), (5), (6)) as d(weekday)   -- Mon..Sat
cross join (values ('09:00'::time, '13:00'::time),
                   ('14:00'::time, '18:00'::time)) as w(start_time, end_time)
where h.status = 'active'
on conflict do nothing;

insert into public.healer_breaks (healer_id, label, weekday, start_time, end_time)
select h.id, 'Afternoon rest', null, '13:00'::time, '14:00'::time
from public.healers h where h.status = 'active'
on conflict do nothing;

update public.healer_booking_settings
   set accepting_bookings = true,
       slot_interval_minutes = 30,
       buffer_minutes = 15,
       min_notice_minutes = 120,
       max_advance_days = 60;

commit;
