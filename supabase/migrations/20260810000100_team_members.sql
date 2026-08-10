-- ============================================================ team_members ====
-- Leadership and team, previously hardcoded in lib/data/founder.ts.
--
-- The About page rendered three people from a TypeScript array, so changing a
-- designation or a photograph meant a code change and a deployment. This moves
-- that content into the database behind the existing content.pages.manage
-- permission, and seeds it with exactly what the site renders today so the
-- public page does not go empty at the moment the migration lands.

create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) between 1 and 120),
  role          text not null check (length(btrim(role)) between 1 and 120),
  bio           text not null default '' check (length(bio) <= 2000),
  photo_url     text,
  photo_alt     text,
  linkedin_url  text,
  display_order integer not null default 0,
  status        public.record_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_by    uuid references auth.users(id) on delete set null
);

-- The public page reads active rows in display order; that is the only hot path.
create index if not exists team_members_public_idx
  on public.team_members (display_order, created_at)
  where status = 'active';

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ RLS ----
-- Same shape as testimonials: the world reads what is active, staff write.
alter table public.team_members enable row level security;

drop policy if exists team_members_select_public on public.team_members;
create policy team_members_select_public on public.team_members
  for select to anon, authenticated using (status = 'active');

drop policy if exists team_members_select_staff on public.team_members;
create policy team_members_select_staff on public.team_members
  for select to authenticated using (public.is_staff());

drop policy if exists team_members_write_staff on public.team_members;
create policy team_members_write_staff on public.team_members
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------- seed ----
-- Only when empty, so re-running the migration never duplicates or overwrites
-- an edit someone has since made in the admin portal.
insert into public.team_members (name, role, bio, photo_url, linkedin_url, display_order)
select * from (values
  (
    'Ashok Mittal',
    'Chief Mentor & Advisor',
    'Founder & CEO of the digital-lending NBFC Prest Loans, with 30+ years across capital markets, banking and financial services, a Harvard Business School executive program, and the author of ''The Fintech Entrepreneur''s Guide'' (2022).',
    'https://healerji.com/images/about/mentor.jpeg',
    'https://www.linkedin.com/in/ashok-mittal-14nov',
    1
  ),
  (
    'Bhupesh Kathuria',
    'Chief Technology Officer',
    'Fifteen years building consumer marketplaces and fintech products, from Wingify to Broctagon; Delhi University graduate with a PG in Blockchain from IIT Kanpur.',
    'https://healerji.com/images/about/cto.jpeg',
    'https://www.linkedin.com/in/bhupeshkathuria',
    2
  ),
  (
    'Aashima Mittal',
    'Chief Financial Officer',
    'Chartered Accountant with statutory-audit experience at Ernst & Young; an alumna of Hindu College, Delhi University, focused on financial oversight and compliance.',
    'https://healerji.com/images/about/cfo.jpeg',
    'https://www.linkedin.com/in/aashima-mittal-38a298137',
    3
  )
) as seed(name, role, bio, photo_url, linkedin_url, display_order)
where not exists (select 1 from public.team_members);
