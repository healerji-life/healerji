-- ============================================================================
-- HealerJi · 0001 · Extensions and enumerated types
-- ----------------------------------------------------------------------------
-- btree_gist is required by the booking overlap exclusion constraint in 0005.
-- Without it, `EXCLUDE USING gist (healer_id WITH =, ...)` cannot be created.
-- ============================================================================

create extension if not exists "pgcrypto"   with schema extensions;
create extension if not exists "btree_gist" with schema extensions;
create extension if not exists "citext"     with schema extensions;

-- ---------------------------------------------------------------- identity --
do $$ begin
  create type public.app_role as enum ('super_admin', 'admin', 'editor', 'healer', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.profile_status as enum ('active', 'suspended', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.auth_provider as enum ('email', 'google', 'apple', 'phone');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------- content --
do $$ begin
  create type public.record_status as enum ('draft', 'active', 'inactive', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'scheduled', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.article_kind as enum ('article', 'guide', 'story');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- sessions --
do $$ begin
  create type public.session_kind as enum ('chat', 'audio', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum (
    'pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_payment_status as enum (
    'unpaid', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability_exception_kind as enum ('unavailable', 'extra');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- payments --
do $$ begin
  create type public.payment_state as enum (
    'created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.refund_state as enum ('pending', 'processed', 'failed');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ range types --
-- Postgres ships tstzrange/daterange but has no range over `time`. The weekly
-- availability overlap constraint in 0004 needs one, and a real range type is
-- guaranteed immutable (unlike casting times to ints inside the constraint).
do $$ begin
  -- subtype_diff is deliberately omitted: it is optional, it only tunes GiST
  -- penalty calculation, and Postgres ships no built-in diff function for `time`.
  create type public.timerange as range (subtype = time);
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------- other --
do $$ begin
  create type public.application_status as enum ('new', 'reviewing', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
