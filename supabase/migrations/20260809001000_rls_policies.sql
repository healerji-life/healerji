-- ============================================================================
-- HealerJi · 0010 · Row Level Security
-- ----------------------------------------------------------------------------
-- Model: RLS is enabled on every table in `public`. A table with RLS enabled
-- and no matching policy denies the operation. Nothing here trusts a value
-- sent by the browser; every decision derives from auth.uid() and
-- public.user_roles.
--
-- service_role bypasses RLS by design. That key is server-only and must never
-- reach the browser — see lib/supabase/admin.ts.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Enable RLS everywhere. Belt and braces: if a future migration adds a table
-- and forgets this, the check at the bottom of this file fails loudly.
-- --------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    -- Deliberately NOT `force row level security`. FORCE subjects the table
    -- owner to RLS too, and every SECURITY DEFINER function here
    -- (handle_new_user, create_booking_hold, the booking_events logger) runs
    -- as the owner. FORCE would break signup and booking outright while
    -- adding no protection: clients only ever connect as anon/authenticated,
    -- who are subject to RLS either way.
  end loop;
end $$;

-- Materialised views cannot carry RLS. Reporting rollups are therefore
-- server-only; the admin UI reads them through the service role.
revoke all on public.page_analytics_daily from anon, authenticated;

-- ============================================================ profiles ====
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No insert policy: rows are created only by the auth.users trigger.
-- No delete policy: accounts are archived, never deleted (requirement 60).

-- A person editing their own profile must not be able to un-suspend
-- themselves or reassign their own provider identity.
create or replace function public.guard_profile_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.auth_provider is distinct from old.auth_provider
     or new.provider_account_id is distinct from old.provider_account_id
     or new.email is distinct from old.email
     or new.last_sign_in_at is distinct from old.last_sign_in_at then
    raise exception 'insufficient_privilege: those profile fields are managed by the platform'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_self_edit on public.profiles;
create trigger profiles_guard_self_edit before update on public.profiles
  for each row execute function public.guard_profile_self_edit();

-- ========================================================== user_roles ====
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_write on public.user_roles;
create policy user_roles_write on public.user_roles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- guard_role_changes() (0002) adds the super_admin-only and no-self-edit rules.

-- ============================================================= healers ====
drop policy if exists healers_select_public on public.healers;
create policy healers_select_public on public.healers
  for select to anon, authenticated
  using (status = 'active');

drop policy if exists healers_select_own on public.healers;
create policy healers_select_own on public.healers
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists healers_select_staff on public.healers;
create policy healers_select_staff on public.healers
  for select to authenticated
  using (public.is_staff());

drop policy if exists healers_write_admin on public.healers;
create policy healers_write_admin on public.healers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists healers_update_own on public.healers;
create policy healers_update_own on public.healers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A healer may edit their own presentation, not their commercial or trust
-- attributes. Without this, healers_update_own would let them set their own
-- price, feature themselves on the homepage, or self-certify as verified.
create or replace function public.guard_healer_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.price_paise          is distinct from old.price_paise
     or new.featured          is distinct from old.featured
     or new.display_order     is distinct from old.display_order
     or new.status            is distinct from old.status
     or new.slug              is distinct from old.slug
     or new.user_id           is distinct from old.user_id
     or new.rating            is distinct from old.rating
     or new.reviews_count     is distinct from old.reviews_count
     or new.verified_identity    is distinct from old.verified_identity
     or new.verified_credentials is distinct from old.verified_credentials
     or new.verified_interviewed is distinct from old.verified_interviewed then
    raise exception 'insufficient_privilege: pricing, ranking, visibility and verification are set by HealerJi'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists healers_guard_self_edit on public.healers;
create trigger healers_guard_self_edit before update on public.healers
  for each row execute function public.guard_healer_self_edit();

-- ============================== healer child tables (taxonomy, media) =====
-- Readable when the parent healer is readable; writable by admins, and by the
-- owning healer for descriptive data only.
do $$
declare tbl text;
begin
  foreach tbl in array array['healer_modalities', 'healer_languages', 'healer_credentials'] loop
    execute format($f$
      drop policy if exists %1$s_select on public.%1$s;
      create policy %1$s_select on public.%1$s
        for select to anon, authenticated
        using (exists (
          select 1 from public.healers h
          where h.id = %1$s.healer_id
            and (h.status = 'active' or h.user_id = auth.uid() or public.is_staff())
        ));

      drop policy if exists %1$s_write_admin on public.%1$s;
      create policy %1$s_write_admin on public.%1$s
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin());

      drop policy if exists %1$s_write_own on public.%1$s;
      create policy %1$s_write_own on public.%1$s
        for all to authenticated
        using (healer_id = public.current_healer_id())
        with check (healer_id = public.current_healer_id());
    $f$, tbl);
  end loop;
end $$;

-- Credential documents are private evidence; only staff and the owner see them.
drop policy if exists healer_credentials_select on public.healer_credentials;
create policy healer_credentials_select on public.healer_credentials
  for select to authenticated
  using (healer_id = public.current_healer_id() or public.is_staff());

-- ==================================================== session offerings ===
drop policy if exists session_offerings_select on public.session_offerings;
create policy session_offerings_select on public.session_offerings
  for select to anon, authenticated
  using (exists (
    select 1 from public.healers h
    where h.id = session_offerings.healer_id
      and (h.status = 'active' or h.user_id = auth.uid() or public.is_staff())
  ));

-- Pricing is an admin decision (requirement 21), so no healer write policy.
drop policy if exists session_offerings_write on public.session_offerings;
create policy session_offerings_write on public.session_offerings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ======================================================== availability ====
-- Not publicly readable. The booking calendar reads slots through
-- public.get_available_slots(), which returns times only — never the
-- healer's underlying schedule, holidays or reasons for absence.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'healer_availability_rules', 'availability_exceptions',
    'healer_breaks', 'healer_booking_settings'
  ] loop
    execute format($f$
      drop policy if exists %1$s_select on public.%1$s;
      create policy %1$s_select on public.%1$s
        for select to authenticated
        using (healer_id = public.current_healer_id() or public.is_staff());

      drop policy if exists %1$s_write_own on public.%1$s;
      create policy %1$s_write_own on public.%1$s
        for all to authenticated
        using (healer_id = public.current_healer_id())
        with check (healer_id = public.current_healer_id());

      drop policy if exists %1$s_write_admin on public.%1$s;
      create policy %1$s_write_admin on public.%1$s
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin());
    $f$, tbl);
  end loop;
end $$;

-- ============================================================ bookings ====
drop policy if exists bookings_select_customer on public.bookings;
create policy bookings_select_customer on public.bookings
  for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists bookings_select_healer on public.bookings;
create policy bookings_select_healer on public.bookings
  for select to authenticated
  using (healer_id = public.current_healer_id());

drop policy if exists bookings_select_admin on public.bookings;
create policy bookings_select_admin on public.bookings
  for select to authenticated
  using (public.is_admin());

-- No INSERT policy at all. Bookings are created only by
-- public.create_booking_hold(), which holds the slot atomically. A direct
-- insert from a client is denied regardless of what it claims about itself.

drop policy if exists bookings_update_customer on public.bookings;
create policy bookings_update_customer on public.bookings
  for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop policy if exists bookings_update_healer on public.bookings;
create policy bookings_update_healer on public.bookings
  for update to authenticated
  using (healer_id = public.current_healer_id())
  with check (healer_id = public.current_healer_id());

drop policy if exists bookings_update_admin on public.bookings;
create policy bookings_update_admin on public.bookings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Money and time are not customer-editable. A customer may cancel; that is all.
create or replace function public.guard_booking_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.amount_paise    is distinct from old.amount_paise
     or new.payment_status is distinct from old.payment_status
     or new.starts_at      is distinct from old.starts_at
     or new.ends_at        is distinct from old.ends_at
     or new.blocks_until   is distinct from old.blocks_until
     or new.healer_id      is distinct from old.healer_id
     or new.customer_id    is distinct from old.customer_id
     or new.reference      is distinct from old.reference then
    raise exception 'insufficient_privilege: reschedules and amounts are changed by HealerJi'
      using errcode = '42501';
  end if;

  -- Customers may only move a booking to cancelled.
  if new.customer_id = auth.uid() and new.healer_id is distinct from public.current_healer_id() then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'insufficient_privilege: a booking can only be cancelled from your account'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_edit on public.bookings;
create trigger bookings_guard_edit before update on public.bookings
  for each row execute function public.guard_booking_edit();

-- ------------------------------------------------------ booking_events ----
drop policy if exists booking_events_select on public.booking_events;
create policy booking_events_select on public.booking_events
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_events.booking_id
        and (b.customer_id = auth.uid() or b.healer_id = public.current_healer_id())
    )
  );

-- ============================================================ payments ====
-- Healers do not see payment rows. Their earnings view is derived by admins;
-- card metadata, gateway ids and fee breakdowns are not theirs to read.
drop policy if exists payments_select_admin on public.payments;
create policy payments_select_admin on public.payments
  for select to authenticated
  using (public.is_admin());

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = payments.booking_id and b.customer_id = auth.uid()
  ));

-- No client write policies. Payment rows are written only by the verified
-- server handler and the webhook, both using the service role.

drop policy if exists refunds_select_admin on public.refunds;
create policy refunds_select_admin on public.refunds
  for select to authenticated using (public.is_admin());

drop policy if exists webhook_events_select_admin on public.webhook_events;
create policy webhook_events_select_admin on public.webhook_events
  for select to authenticated using (public.is_admin());

-- ============================================================= content ====
drop policy if exists articles_select_public on public.articles;
create policy articles_select_public on public.articles
  for select to anon, authenticated
  using (status = 'published' and (published_at is null or published_at <= now()));

drop policy if exists articles_select_staff on public.articles;
create policy articles_select_staff on public.articles
  for select to authenticated using (public.is_staff());

-- Editors manage blogs and selected content (requirement 8).
drop policy if exists articles_write_staff on public.articles;
create policy articles_write_staff on public.articles
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists practices_select_public on public.practices;
create policy practices_select_public on public.practices
  for select to anon, authenticated
  using (status = 'published' and (published_at is null or published_at <= now()));

drop policy if exists practices_write_staff on public.practices;
create policy practices_write_staff on public.practices
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists testimonials_select_public on public.testimonials;
create policy testimonials_select_public on public.testimonials
  for select to anon, authenticated using (status = 'published');

drop policy if exists testimonials_write_staff on public.testimonials;
create policy testimonials_write_staff on public.testimonials
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Reference taxonomies: world-readable, staff-writable.
do $$
declare tbl text;
begin
  foreach tbl in array array['modalities', 'languages', 'article_categories', 'site_content', 'media_assets'] loop
    execute format($f$
      drop policy if exists %1$s_select on public.%1$s;
      create policy %1$s_select on public.%1$s for select to anon, authenticated using (true);

      drop policy if exists %1$s_write on public.%1$s;
      create policy %1$s_write on public.%1$s for all to authenticated
        using (public.is_staff()) with check (public.is_staff());
    $f$, tbl);
  end loop;
end $$;

-- ============================================================ analytics ===
-- No client write policies: ingestion goes through /api/analytics/collect
-- using the service role, so a visitor cannot forge events, inflate a page's
-- numbers, or attribute a booking to a page it did not come from.
do $$
declare tbl text;
begin
  foreach tbl in array array['analytics_sessions', 'page_views', 'analytics_events'] loop
    execute format($f$
      drop policy if exists %1$s_select_staff on public.%1$s;
      create policy %1$s_select_staff on public.%1$s
        for select to authenticated using (public.is_staff());
    $f$, tbl);
  end loop;
end $$;

-- ======================================================= admin surfaces ===
drop policy if exists audit_select_admin on public.admin_audit_logs;
create policy audit_select_admin on public.admin_audit_logs
  for select to authenticated using (public.is_admin());

drop policy if exists audit_insert_admin on public.admin_audit_logs;
create policy audit_insert_admin on public.admin_audit_logs
  for insert to authenticated with check (public.is_staff());

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated using (public.is_staff());

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists export_jobs_own on public.export_jobs;
create policy export_jobs_own on public.export_jobs
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

do $$
declare tbl text;
begin
  foreach tbl in array array['import_batches', 'import_rows'] loop
    execute format($f$
      drop policy if exists %1$s_staff on public.%1$s;
      create policy %1$s_staff on public.%1$s for all to authenticated
        using (public.is_staff()) with check (public.is_staff());
    $f$, tbl);
  end loop;
end $$;

drop policy if exists healer_invitations_admin on public.healer_invitations;
create policy healer_invitations_admin on public.healer_invitations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Inbound form submissions contain personal data: admins only, and the forms
-- themselves write via the service role.
drop policy if exists healer_applications_admin on public.healer_applications;
create policy healer_applications_admin on public.healer_applications
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists contact_messages_admin on public.contact_messages;
create policy contact_messages_admin on public.contact_messages
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================== grants ====
grant usage on schema public to anon, authenticated;
grant select on public.healer_cards        to anon, authenticated;
grant select on public.published_articles  to anon, authenticated;

-- ====================================================== self-check ========
-- Fails the migration if any public table ended up without RLS.
do $$
declare offenders text;
begin
  select string_agg(c.relname, ', ')
  into offenders
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

  if offenders is not null then
    raise exception 'RLS is not enabled on: %', offenders;
  end if;
end $$;
