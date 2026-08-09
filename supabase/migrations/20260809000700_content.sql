-- ============================================================================
-- HealerJi · 0007 · Content: articles, categories, practices, testimonials
-- ----------------------------------------------------------------------------
-- Replaces lib/data/articles.ts. Body is stored twice on purpose:
--   body_blocks   — the existing string[] of paragraphs, preserved verbatim so
--                   the current renderer keeps working unchanged.
--   body_markdown — the editable representation the CMS writes.
-- A trigger keeps blocks derived from markdown once an editor touches a piece.
-- ============================================================================

create table if not exists public.article_categories (
  slug          text primary key,
  name          text not null,
  description   text,
  display_order integer not null default 0,
  status        public.record_status not null default 'active'
);

create table if not exists public.articles (
  id       uuid primary key default gen_random_uuid(),
  slug     text not null unique,
  title    text not null,
  kind     public.article_kind not null default 'article',

  category_slug text references public.article_categories (slug) on update cascade on delete set null,
  pathway       text,
  tags          text[] not null default '{}',

  read_minutes smallint not null default 5 check (read_minutes between 1 and 120),
  excerpt      text not null default '',      -- was `standfirst`
  body_blocks  jsonb not null default '[]'::jsonb,
  body_markdown text not null default '',

  cover_url text,
  cover_alt text,

  -- Free-text author preserved ("The HealerJi Journal"); author_id links a real
  -- account when one exists.
  author_name text not null default 'The HealerJi Journal',
  author_id   uuid references public.profiles (id) on delete set null,

  status       public.content_status not null default 'draft',
  published_at timestamptz,
  featured     boolean not null default false,

  seo_title       text,
  seo_description text,
  og_image_url    text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,

  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_body_is_array check (jsonb_typeof(body_blocks) = 'array'),
  -- Scheduling only means something with a date attached.
  constraint articles_scheduled_needs_date check (status <> 'scheduled' or published_at is not null)
);

create index if not exists articles_status_idx    on public.articles (status, published_at desc);
create index if not exists articles_pathway_idx   on public.articles (pathway);
create index if not exists articles_category_idx  on public.articles (category_slug);
create index if not exists articles_featured_idx  on public.articles (featured) where featured;
create index if not exists articles_tags_idx      on public.articles using gin (tags);
create index if not exists articles_search_idx    on public.articles
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body_markdown,'')));

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

-- Keep the two body representations consistent. Markdown is authoritative once
-- it is non-empty; otherwise the imported blocks stand.
create or replace function public.sync_article_body()
returns trigger
language plpgsql
as $$
begin
  if new.body_markdown is distinct from '' and
     (tg_op = 'INSERT' or new.body_markdown is distinct from old.body_markdown) then
    -- WITH ORDINALITY: aggregate order must be explicit, paragraph order matters.
    new.body_blocks := coalesce((
      select jsonb_agg(btrim(t.part) order by t.ord)
      from unnest(regexp_split_to_array(new.body_markdown, '\n\s*\n'))
           with ordinality as t(part, ord)
      where btrim(t.part) <> ''
    ), '[]'::jsonb);
  elsif new.body_markdown = '' and jsonb_array_length(new.body_blocks) > 0 then
    new.body_markdown := (
      select string_agg(t.value #>> '{}', E'\n\n' order by t.ord)
      from jsonb_array_elements(new.body_blocks) with ordinality as t(value, ord)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists articles_sync_body on public.articles;
create trigger articles_sync_body before insert or update on public.articles
  for each row execute function public.sync_article_body();

-- A published article is one whose date has arrived. Scheduling therefore
-- needs no cron: the view is time-aware.
create or replace view public.published_articles
with (security_invoker = true)
as
select *
from public.articles a
where a.status = 'published'
  and (a.published_at is null or a.published_at <= now());

-- --------------------------------------------------------- practices ------
create table if not exists public.practices (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  summary       text not null default '',
  pathway       text,
  chakra_slug   text,
  minutes       smallint not null default 9 check (minutes between 1 and 180),
  audio_url     text,
  cover_url     text,
  steps         jsonb not null default '[]'::jsonb,
  status        public.content_status not null default 'draft',
  featured      boolean not null default false,
  display_order integer not null default 0,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  constraint practices_steps_is_array check (jsonb_typeof(steps) = 'array')
);

drop trigger if exists practices_set_updated_at on public.practices;
create trigger practices_set_updated_at before update on public.practices
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------- testimonials -----
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  anonymous     boolean not null default false,
  path_slug     text,
  quote         text not null,
  healer_id     uuid references public.healers (id) on delete set null,
  status        public.content_status not null default 'draft',
  featured      boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------- site content -------
-- Editable copy that is genuinely content (hero lines, CTA text, featured
-- selections). Application configuration deliberately stays in code
-- (requirement 36's "sensible separation").
create table if not exists public.site_content (
  key         text primary key,
  label       text not null,
  description text,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- --------------------------------------------------- import staging -------
-- Bulk CSV/XLSX import lands here first so it can be previewed, validated and
-- corrected before a single production row is written (requirements 33, 34).
create table if not exists public.import_batches (
  id           uuid primary key default gen_random_uuid(),
  target       text not null check (target in ('healers', 'articles')),
  filename     text,
  row_count    integer not null default 0,
  valid_count  integer not null default 0,
  error_count  integer not null default 0,
  status       text not null default 'parsed'
                 check (status in ('parsed', 'previewed', 'committed', 'discarded', 'failed')),
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  committed_at timestamptz
);

create table if not exists public.import_rows (
  id         bigserial primary key,
  batch_id   uuid not null references public.import_batches (id) on delete cascade,
  row_number integer not null,
  raw        jsonb not null,
  normalised jsonb,
  errors     jsonb not null default '[]'::jsonb,
  valid      boolean not null default false,
  committed_record_id uuid,
  unique (batch_id, row_number)
);

create index if not exists import_rows_batch_idx on public.import_rows (batch_id, row_number);

-- ------------------------------------------- inbound forms (persisted) ----
create table if not exists public.healer_applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       extensions.citext not null,
  phone       text,
  modalities  text not null,
  years       smallint,
  languages   text,
  about       text not null,
  status      public.application_status not null default 'new',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_healer_id uuid references public.healers (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists healer_applications_status_idx
  on public.healer_applications (status, created_at desc);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      extensions.citext not null,
  topic      text not null,
  message    text not null,
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
