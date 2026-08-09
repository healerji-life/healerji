-- ============================================================================
-- HealerJi · 0002 · Profiles, roles, and the role-escalation guard
-- ----------------------------------------------------------------------------
-- auth.users is owned by Supabase Auth and is never written to directly.
-- public.profiles mirrors the parts of it the application is allowed to read,
-- and is the join target for every other table. Passwords never appear here.
-- ============================================================================

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             extensions.citext not null,
  full_name         text,
  avatar_url        text,
  phone             text,
  locale            text        not null default 'en-IN',
  timezone          text        not null default 'Asia/Kolkata',
  marketing_opt_in  boolean     not null default false,
  status            public.profile_status not null default 'active',
  auth_provider     public.auth_provider  not null default 'email',
  -- Provider subject identifier (Google's `sub`). Never an access token.
  provider_account_id text,
  last_sign_in_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);

create unique index if not exists profiles_email_key on public.profiles (email);
create index if not exists profiles_status_idx      on public.profiles (status);
create index if not exists profiles_created_at_idx  on public.profiles (created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is
  'Application-visible mirror of auth.users. Contains no credentials or tokens.';

-- ------------------------------------------------------------------- roles --

create table if not exists public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists user_roles_role_idx on public.user_roles (role);

comment on table public.user_roles is
  'Authoritative role assignment. RLS everywhere derives from this table, never from a client-supplied claim.';

-- ------------------------------------------------------- security helpers --
-- SECURITY DEFINER so that policies on user_roles do not recurse into
-- themselves. search_path is pinned to defeat search_path hijacking.

create or replace function public.has_role(target public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = target
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin', 'editor')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'super_admin'
  );
$$;

revoke execute on function public.has_role(public.app_role) from public;
grant  execute on function public.has_role(public.app_role) to authenticated, service_role;
grant  execute on function public.is_admin(), public.is_staff(), public.is_super_admin()
  to authenticated, service_role;

-- --------------------------------------------- role escalation prevention --
-- Requirement: "A healer must never be able to elevate themselves to admin."
-- RLS alone is not enough here, because a future policy mistake would silently
-- re-open the hole. This trigger is a second, independent lock.

create or replace function public.guard_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  touched public.app_role;
begin
  -- service_role / migrations run without a JWT; bootstrapping is allowed there.
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  touched := case when tg_op = 'DELETE' then old.role else new.role end;

  if not public.is_admin() then
    raise exception 'insufficient_privilege: only an administrator may change roles'
      using errcode = '42501';
  end if;

  -- Only a super_admin may mint or revoke privileged roles.
  if touched in ('super_admin', 'admin') and not public.is_super_admin() then
    raise exception 'insufficient_privilege: only a super_admin may grant or revoke administrator roles'
      using errcode = '42501';
  end if;

  -- Nobody may change their own role set, super_admin included. This prevents
  -- both self-escalation and accidental self-lockout being a one-click action.
  if (case when tg_op = 'DELETE' then old.user_id else new.user_id end) = auth.uid() then
    raise exception 'insufficient_privilege: you cannot modify your own roles'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard
  before insert or update or delete on public.user_roles
  for each row execute function public.guard_role_changes();

-- ------------------------------------------------ auth.users -> profiles ---
-- Runs on signup and on every auth-metadata refresh, so Google sign-in
-- populates exactly the fields the OAuth provider actually returned and
-- nothing more.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  provider public.auth_provider;
begin
  provider := case new.raw_app_meta_data ->> 'provider'
    when 'google' then 'google'::public.auth_provider
    when 'apple'  then 'apple'::public.auth_provider
    when 'phone'  then 'phone'::public.auth_provider
    else 'email'::public.auth_provider
  end;

  insert into public.profiles as p (
    id, email, full_name, avatar_url, auth_provider, provider_account_id, last_sign_in_at
  )
  values (
    new.id,
    coalesce(new.email, '')::extensions.citext,
    nullif(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ), ''),
    nullif(coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ), ''),
    provider,
    nullif(coalesce(
      new.raw_user_meta_data ->> 'provider_id',
      new.raw_user_meta_data ->> 'sub'
    ), ''),
    new.last_sign_in_at
  )
  on conflict (id) do update set
    email           = excluded.email,
    -- never overwrite a name the person edited themselves with a provider value
    full_name       = coalesce(p.full_name, excluded.full_name),
    avatar_url      = coalesce(excluded.avatar_url, p.avatar_url),
    last_sign_in_at = coalesce(excluded.last_sign_in_at, p.last_sign_in_at);

  -- Everyone starts as a customer. Elevation is a deliberate admin action.
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data, last_sign_in_at on auth.users
  for each row execute function public.handle_new_user();
