-- ============================================================================
-- HealerJi · 0003 · Healers, reference taxonomies, credentials, media
-- ----------------------------------------------------------------------------
-- Replaces lib/data/healers.ts. Every field rendered on a healer card or a
-- healer profile page lives here, so editing a card never requires a code
-- change or a redeploy (requirement 22 / 37).
-- ============================================================================

-- ---------------------------------------------------------- taxonomies ----
create table if not exists public.modalities (
  slug          text primary key,
  name          text not null,
  essence       text,
  what          text,
  session_note  text,
  is_not        text,
  path_slugs    text[] not null default '{}',
  display_order integer not null default 0,
  status        public.record_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.languages (
  code          text primary key,          -- 'en', 'hi', 'ta'
  name          text not null unique,      -- 'English', 'Hindi'
  display_order integer not null default 0
);

drop trigger if exists modalities_set_updated_at on public.modalities;
create trigger modalities_set_updated_at before update on public.modalities
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- healers ----
create table if not exists public.healers (
  id            uuid primary key default gen_random_uuid(),
  -- Null until the healer is invited and accepts a portal account.
  user_id       uuid unique references public.profiles (id) on delete set null,

  slug          text not null unique,
  name          text not null,
  headline      text not null default '',
  bio           text not null default '',
  gender        text check (gender in ('female', 'male', 'other', 'undisclosed')),
  years         smallint not null default 0 check (years between 0 and 80),

  -- Ratings are derived from reviews once that table exists; kept here as the
  -- displayed values so the current cards keep working. Admin-editable.
  rating        numeric(2,1) check (rating is null or rating between 0 and 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),

  -- Base rate for the reference 45-minute session, in paise. Integer only:
  -- never store money as float.
  price_paise   integer not null default 0 check (price_paise >= 0),
  currency      char(3) not null default 'INR',

  verified_identity    boolean not null default false,
  verified_credentials boolean not null default false,
  verified_interviewed boolean not null default false,

  avatar_url    text,
  avatar_alt    text,
  cover_url     text,
  cover_alt     text,

  timezone      text not null default 'Asia/Kolkata',

  featured      boolean not null default false,
  display_order integer not null default 0,
  status        public.record_status not null default 'draft',

  seo_title       text,
  seo_description text,
  og_image_url    text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,

  constraint healers_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists healers_status_idx   on public.healers (status);
create index if not exists healers_featured_idx on public.healers (featured) where featured;
create index if not exists healers_order_idx    on public.healers (display_order, name);
create index if not exists healers_user_idx     on public.healers (user_id);
create index if not exists healers_search_idx   on public.healers
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(headline,'')));

drop trigger if exists healers_set_updated_at on public.healers;
create trigger healers_set_updated_at before update on public.healers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------ healer taxonomy ----
create table if not exists public.healer_modalities (
  healer_id     uuid not null references public.healers (id) on delete cascade,
  modality_slug text not null references public.modalities (slug) on update cascade on delete restrict,
  display_order integer not null default 0,
  primary key (healer_id, modality_slug)
);

create index if not exists healer_modalities_modality_idx
  on public.healer_modalities (modality_slug);

create table if not exists public.healer_languages (
  healer_id     uuid not null references public.healers (id) on delete cascade,
  language_code text not null references public.languages (code) on update cascade on delete restrict,
  display_order integer not null default 0,
  primary key (healer_id, language_code)
);

create index if not exists healer_languages_language_idx
  on public.healer_languages (language_code);

-- --------------------------------------------------- healer credentials ----
create table if not exists public.healer_credentials (
  id            uuid primary key default gen_random_uuid(),
  healer_id     uuid not null references public.healers (id) on delete cascade,
  title         text not null,
  issuer        text,
  issued_year   smallint check (issued_year is null or issued_year between 1900 and 2200),
  document_url  text,          -- Cloudinary / private storage reference
  verified      boolean not null default false,
  verified_by   uuid references public.profiles (id) on delete set null,
  verified_at   timestamptz,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists healer_credentials_healer_idx
  on public.healer_credentials (healer_id);

comment on column public.healer_credentials.document_url is
  'Private. Never selected by the public healer view.';

-- ----------------------------------------------------- session offerings ----
-- What a healer sells, and for how much. The 45-minute row is the base rate.
create table if not exists public.session_offerings (
  id               uuid primary key default gen_random_uuid(),
  healer_id        uuid not null references public.healers (id) on delete cascade,
  kind             public.session_kind not null,
  duration_minutes smallint not null check (duration_minutes between 15 and 180),
  price_paise      integer  not null check (price_paise >= 0),
  active           boolean  not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (healer_id, kind, duration_minutes)
);

create index if not exists session_offerings_healer_idx
  on public.session_offerings (healer_id) where active;

drop trigger if exists session_offerings_set_updated_at on public.session_offerings;
create trigger session_offerings_set_updated_at before update on public.session_offerings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- media assets --
-- Image binaries live in Cloudinary / Supabase Storage, never in Postgres.
create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'cloudinary',
  public_id     text not null,
  secure_url    text not null,
  width         integer,
  height        integer,
  bytes         integer,
  format        text,
  alt_text      text,
  folder        text,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (provider, public_id)
);

-- -------------------------------------------------------- healer invites ----
-- Admins invite healers; the admin never sees or sets a password (req. 24).
create table if not exists public.healer_invitations (
  id          uuid primary key default gen_random_uuid(),
  healer_id   uuid not null references public.healers (id) on delete cascade,
  email       extensions.citext not null,
  invited_by  uuid references public.profiles (id) on delete set null,
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  expires_at  timestamptz not null default (now() + interval '14 days')
);

create index if not exists healer_invitations_healer_idx on public.healer_invitations (healer_id);
create unique index if not exists healer_invitations_pending_key
  on public.healer_invitations (healer_id, email)
  where accepted_at is null and revoked_at is null;

-- ------------------------------------------------- current_healer_id() ------
-- Used by every healer-scoped RLS policy. Defined here because it needs
-- public.healers to exist.
create or replace function public.current_healer_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select h.id from public.healers h where h.user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_healer_id() to authenticated, service_role;

-- ---------------------------------------------------- public card view ------
-- The exact shape the public website needs, with private columns excluded.
create or replace view public.healer_cards
with (security_invoker = true)
as
select
  h.id,
  h.slug,
  h.name,
  h.headline,
  h.bio,
  h.gender,
  h.years,
  h.rating,
  h.reviews_count,
  h.price_paise,
  h.currency,
  h.avatar_url,
  h.avatar_alt,
  h.cover_url,
  h.featured,
  h.display_order,
  h.status,
  h.timezone,
  h.seo_title,
  h.seo_description,
  h.og_image_url,
  jsonb_build_object(
    'identity',    h.verified_identity,
    'credentials', h.verified_credentials,
    'interviewed', h.verified_interviewed
  ) as verified,
  coalesce((
    select array_agg(hm.modality_slug order by hm.display_order, hm.modality_slug)
    from public.healer_modalities hm where hm.healer_id = h.id
  ), '{}') as modalities,
  coalesce((
    select array_agg(l.name order by hl.display_order, l.name)
    from public.healer_languages hl
    join public.languages l on l.code = hl.language_code
    where hl.healer_id = h.id
  ), '{}') as languages,
  coalesce((
    select array_agg(distinct so.kind::text)
    from public.session_offerings so
    where so.healer_id = h.id and so.active
  ), '{}') as session_types
from public.healers h;

comment on view public.healer_cards is
  'Public-safe projection of a healer. security_invoker=true so the caller''s RLS on public.healers still applies.';
