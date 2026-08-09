-- ============================================================================
-- HealerJi · 0006 · Payments, refunds, webhook idempotency
-- ----------------------------------------------------------------------------
-- The browser is never authoritative. A booking becomes paid only when a
-- server-verified signature (handler or webhook) says so. This table is the
-- ledger the admin Razorpay analytics reads, so those numbers do not depend on
-- a live API call to Razorpay.
-- ============================================================================

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,

  provider   text not null default 'razorpay',
  razorpay_order_id   text not null,
  razorpay_payment_id text,
  -- The signature we verified, retained for dispute forensics. This is a
  -- one-way HMAC of ids we already store; it is not a credential.
  razorpay_signature  text,

  amount_paise          integer not null check (amount_paise >= 0),
  amount_refunded_paise integer not null default 0 check (amount_refunded_paise >= 0),
  currency              char(3) not null default 'INR',

  status public.payment_state not null default 'created',
  method text,                      -- card / upi / netbanking / wallet
  -- Razorpay charges a fee and tax per capture; storing both gives net revenue.
  fee_paise integer,
  tax_paise integer,

  error_code        text,
  error_description text,

  -- Which channel proved this payment. Useful when reconciling.
  verified_via text check (verified_via in ('handler', 'webhook', 'reconciliation', 'manual')),
  verified_at  timestamptz,
  captured_at  timestamptz,

  notes      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payments_refund_within_amount check (amount_refunded_paise <= amount_paise)
);

create unique index if not exists payments_order_key   on public.payments (provider, razorpay_order_id);
create unique index if not exists payments_payment_key on public.payments (provider, razorpay_payment_id)
  where razorpay_payment_id is not null;
create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_status_idx  on public.payments (status, created_at desc);
create index if not exists payments_captured_idx on public.payments (captured_at desc)
  where status = 'captured';

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------- refunds ---
create table if not exists public.refunds (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  razorpay_refund_id text,
  amount_paise integer not null check (amount_paise > 0),
  currency     char(3) not null default 'INR',
  status       public.refund_state not null default 'pending',
  reason       text,
  initiated_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists refunds_provider_key on public.refunds (razorpay_refund_id)
  where razorpay_refund_id is not null;
create index if not exists refunds_payment_idx on public.refunds (payment_id);

-- Financial records are never hard-deleted (requirement 60).
create or replace function public.block_financial_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'financial records cannot be deleted; change status instead'
    using errcode = '42501';
end;
$$;

drop trigger if exists payments_no_delete on public.payments;
create trigger payments_no_delete before delete on public.payments
  for each row execute function public.block_financial_delete();

drop trigger if exists refunds_no_delete on public.refunds;
create trigger refunds_no_delete before delete on public.refunds
  for each row execute function public.block_financial_delete();

-- ------------------------------------------------- webhook idempotency -----
-- Razorpay retries. Requirement 16 asks for idempotent processing: the unique
-- index on (provider, event_id) is what makes a replayed webhook a no-op.
create table if not exists public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'razorpay',
  event_id      text not null,
  event_type    text not null,
  signature_valid boolean not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  processing_error text,
  unique (provider, event_id)
);

create index if not exists webhook_events_type_idx on public.webhook_events (event_type, received_at desc);
create index if not exists webhook_events_unprocessed_idx on public.webhook_events (received_at)
  where processed_at is null;

-- ------------------------------------------- payment -> booking rollup -----
-- Keeps bookings.payment_status truthful without the application having to
-- remember to update two tables.
create or replace function public.sync_booking_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid := new.booking_id;
  next_status public.booking_payment_status;
begin
  if target is null then return new; end if;

  select case
    when p.status = 'captured' and p.amount_refunded_paise = 0            then 'paid'
    when p.status = 'captured' and p.amount_refunded_paise >= p.amount_paise then 'refunded'
    when p.status = 'captured' and p.amount_refunded_paise > 0            then 'partially_refunded'
    when p.status = 'refunded'                                            then 'refunded'
    when p.status = 'partially_refunded'                                  then 'partially_refunded'
    when p.status = 'failed'                                              then 'failed'
    when p.status = 'authorized'                                          then 'processing'
    else 'unpaid'
  end::public.booking_payment_status
  into next_status
  from public.payments p where p.id = new.id;

  update public.bookings b
     set payment_status = next_status,
         -- A captured payment is the only thing that confirms a session.
         status = case
           when next_status = 'paid' and b.status = 'pending_payment' then 'confirmed'
           else b.status
         end,
         hold_expires_at = case when next_status = 'paid' then null else b.hold_expires_at end
   where b.id = target;

  return new;
end;
$$;

drop trigger if exists payments_sync_booking on public.payments;
create trigger payments_sync_booking
  after insert or update of status, amount_refunded_paise on public.payments
  for each row execute function public.sync_booking_payment_status();

-- Refund rows roll up into the payment, which then rolls up into the booking.
create or replace function public.sync_payment_refund_total()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid := coalesce(new.payment_id, old.payment_id);
begin
  update public.payments p
     set amount_refunded_paise = coalesce((
           select sum(r.amount_paise) from public.refunds r
           where r.payment_id = target and r.status = 'processed'
         ), 0)
   where p.id = target;
  -- AFTER trigger: return value is ignored, but coalesce(new, old) on row
  -- types can fail polymorphic resolution, so branch explicitly.
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists refunds_sync_payment on public.refunds;
create trigger refunds_sync_payment
  after insert or update on public.refunds
  for each row execute function public.sync_payment_refund_total();
