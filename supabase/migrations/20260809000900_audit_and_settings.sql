-- ============================================================================
-- HealerJi · 0009 · Audit log, settings, notifications
-- ============================================================================

create table if not exists public.admin_audit_logs (
  id            bigserial primary key,
  actor_id      uuid references public.profiles (id) on delete set null,
  actor_email   text,                 -- denormalised: survives account deletion
  actor_role    public.app_role,
  action        text not null,        -- 'healer.created', 'blog.published', ...
  resource_type text not null,
  resource_id   text,
  summary       text,
  -- Redacted before insert by public.redact_audit_payload().
  before_data   jsonb,
  after_data    jsonb,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_actor_idx    on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists audit_resource_idx on public.admin_audit_logs (resource_type, resource_id);
create index if not exists audit_action_idx   on public.admin_audit_logs (action, created_at desc);
create index if not exists audit_time_idx     on public.admin_audit_logs (created_at desc);

-- The audit log is append-only. An admin who can rewrite the audit log has no
-- audit log.
create or replace function public.block_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'the audit log is append-only' using errcode = '42501';
end;
$$;

drop trigger if exists audit_no_update on public.admin_audit_logs;
create trigger audit_no_update before update or delete on public.admin_audit_logs
  for each row execute function public.block_audit_mutation();

-- Requirement 38: "Do not store passwords, tokens or secrets."
-- Enforced here rather than trusted to every future call site.
create or replace function public.redact_audit_payload()
returns trigger
language plpgsql
as $$
declare
  banned constant text[] := array[
    'password', 'password_hash', 'encrypted_password', 'token', 'access_token',
    'refresh_token', 'id_token', 'secret', 'api_key', 'key_secret',
    'webhook_secret', 'service_role_key', 'razorpay_signature', 'otp',
    'authorization', 'cookie', 'session'
  ];
  k text;
begin
  foreach k in array banned loop
    if new.before_data ? k then new.before_data := jsonb_set(new.before_data, array[k], '"[redacted]"'::jsonb); end if;
    if new.after_data  ? k then new.after_data  := jsonb_set(new.after_data,  array[k], '"[redacted]"'::jsonb); end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists audit_redact on public.admin_audit_logs;
create trigger audit_redact before insert on public.admin_audit_logs
  for each row execute function public.redact_audit_payload();

-- ------------------------------------------------------------- settings ----
-- Values here are operational configuration (booking windows, notification
-- toggles). Secrets are NOT stored here — they stay in Vercel env vars and the
-- admin UI only ever renders "configured" / "not configured" (requirement 39).
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  label       text,
  description text,
  category    text not null default 'general',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  constraint app_settings_no_secrets check (
    key !~* '(secret|password|token|api_key|service_role)'
  )
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------- notifications ----
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ------------------------------------------------------- export audit ------
-- Requirement 53: exports are permission-checked and audited.
create table if not exists public.export_jobs (
  id           uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles (id) on delete set null,
  dataset      text not null check (dataset in
                 ('healers', 'customers', 'bookings', 'payments', 'articles', 'analytics')),
  format       text not null check (format in ('csv', 'xlsx', 'pdf')),
  filters      jsonb not null default '{}'::jsonb,
  row_count    integer,
  status       text not null default 'pending'
                 check (status in ('pending', 'complete', 'failed', 'denied')),
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists export_jobs_requester_idx on public.export_jobs (requested_by, created_at desc);
