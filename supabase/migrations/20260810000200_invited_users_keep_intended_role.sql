-- ============================ invited users keep their intended role ========
-- handle_new_user() granted 'customer' to every auth.users row, on INSERT and
-- again on every UPDATE of email, metadata or last_sign_in_at.
--
-- For a public signup that is right: everyone starts as a customer and
-- elevation is a deliberate admin action.
--
-- For an invitation it is not. inviteUserByEmail creates the account, the
-- trigger stamps 'customer' on it, and only then does the application insert
-- the role the admin actually chose. The account ends up holding both, and
-- since nothing orders user_roles, 'customer' is often the row that comes back
-- first — which is the role the admin shell displays and the audit log
-- records. Production shows super_admin actions attributed to 'customer'.
--
-- Re-running on UPDATE also made the customer role impossible to revoke: it
-- reappeared the next time the person signed in.
--
-- Public signups are unchanged. Only invited accounts, and only the automatic
-- grant, are affected. No role is ever removed by the trigger.

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

  -- A public signup starts as a customer. An invited account gets the role the
  -- inviting admin chose, so it is left alone. Only ever on INSERT: an UPDATE
  -- must not resurrect a role an admin has deliberately revoked.
  if tg_op = 'INSERT' and new.invited_at is null then
    insert into public.user_roles (user_id, role)
    values (new.id, 'customer')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

-- --------------------------------------------------------------- backfill ---
-- Drop the automatic 'customer' grant from accounts that were invited and hold
-- a real role. Deliberately narrow: an invited account with no other role keeps
-- customer rather than being left with none, and public signups are untouched.
delete from public.user_roles ur
where ur.role = 'customer'
  and exists (
    select 1 from auth.users u
    where u.id = ur.user_id and u.invited_at is not null
  )
  and exists (
    select 1 from public.user_roles other
    where other.user_id = ur.user_id and other.role <> 'customer'
  );
