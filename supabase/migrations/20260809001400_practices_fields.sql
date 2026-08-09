-- ============================================================================
-- HealerJi · 0014 · Complete the practices model  (ADDITIVE)
-- ----------------------------------------------------------------------------
-- The practices table (0007) was created before the public practice model was
-- fully understood. Two fields the site actually renders are missing:
--
--   category    the pill on the practice card ("Breath", "Forgiveness", ...)
--   after_note  the honest closing note shown on completion — the line that
--               tells someone to see a doctor if worry is constant. That is a
--               safety message, not decoration, so it must survive the cutover.
--
-- Deliberately ALTER rather than a second table: the existing schema is right,
-- it was just incomplete.
-- ============================================================================

alter table public.practices
  add column if not exists category   text,
  add column if not exists after_note text not null default '';

comment on column public.practices.after_note is
  'Shown when a practice completes. Carries the medical-care caveat; never render a practice without it.';

-- Categories are a small, curated vocabulary rather than free text, so the
-- public filter stays coherent. Kept as a CHECK rather than an enum so an
-- editor can extend it with one migration and no type juggling.
alter table public.practices
  drop constraint if exists practices_category_known;
alter table public.practices
  add constraint practices_category_known check (
    category is null or category in ('Breath', 'Energy', 'Forgiveness', 'Grounding', 'Sleep')
  );

create index if not exists practices_category_idx on public.practices (category)
  where status = 'published';
create index if not exists practices_published_idx on public.practices (status, display_order)
  where status = 'published';

-- Public read of published practices, time-aware in the same way as articles so
-- a scheduled practice needs no cron job.
create or replace view public.published_practices
with (security_invoker = true)
as
select *
from public.practices p
where p.status = 'published'
  and (p.published_at is null or p.published_at <= now());

grant select on public.published_practices to anon, authenticated;
