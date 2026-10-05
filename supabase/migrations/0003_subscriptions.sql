-- Step 5: monthly subscriptions, two-bucket credits, and the credit-unit ×4 migration.
-- Apply in Supabase (SQL Editor) once, after 0001 and 0002.
--
-- Credit model:
--   monthly_credits  — reset to the plan allotment on each billing month (no rollover)
--   topup_credits    — never expire; spent only AFTER monthly credits run out
--   balance          — kept as a mirror (= monthly + topup) so existing reads
--                      (sb.getCredits selects `balance`) keep working unchanged
--
-- NOTE: the ×4 migration block near the bottom must run exactly once.

alter table public.credits add column if not exists monthly_credits   integer not null default 0;
alter table public.credits add column if not exists topup_credits      integer not null default 0;
alter table public.credits add column if not exists monthly_allotment  integer not null default 0;

-- Needed for ON CONFLICT upserts below (one credits row per user).
create unique index if not exists credits_user_id_key on public.credits(user_id);

-- Spend monthly first, then top-up. Atomic (row lock). Raises on insufficient.
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text default 'generation',
  p_ref_id  text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  m integer;
  tp integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select monthly_credits, topup_credits into m, tp
  from public.credits where user_id = p_user_id for update;

  if not found or (coalesce(m, 0) + coalesce(tp, 0)) < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  if m >= p_amount then
    m := m - p_amount;
  else
    tp := tp - (p_amount - m);
    m := 0;
  end if;

  update public.credits set monthly_credits = m, topup_credits = tp, balance = m + tp
  where user_id = p_user_id;

  insert into public.credit_ledger(user_id, delta, reason, ref_id)
  values (p_user_id, -p_amount, p_reason, p_ref_id);

  return m + tp;
end;
$$;

-- Add persistent top-up credits (also used for refunds). Upserts the row.
create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_total integer;
begin
  insert into public.credits (user_id, monthly_credits, topup_credits, monthly_allotment, balance)
  values (p_user_id, 0, p_amount, 0, p_amount)
  on conflict (user_id) do update
    set topup_credits = public.credits.topup_credits + p_amount,
        balance = public.credits.monthly_credits + public.credits.topup_credits + p_amount
  returning balance into new_total;

  insert into public.credit_ledger(user_id, delta, reason)
  values (p_user_id, p_amount, 'topup');
  return new_total;
end;
$$;

-- Reset monthly credits to the plan allotment (subscription renewal). No rollover.
create or replace function public.refill_monthly_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_total integer;
begin
  insert into public.credits (user_id, monthly_credits, topup_credits, monthly_allotment, balance)
  values (p_user_id, p_amount, 0, p_amount, p_amount)
  on conflict (user_id) do update
    set monthly_credits = p_amount,
        monthly_allotment = p_amount,
        balance = p_amount + public.credits.topup_credits
  returning balance into new_total;

  insert into public.credit_ledger(user_id, delta, reason)
  values (p_user_id, p_amount, 'subscription_refill');
  return new_total;
end;
$$;

-- Lock all three down to the service role (same as 0001).
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_credits', 'deduct_credits', 'refill_monthly_credits')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

-- Subscriptions: maps a Paddle subscription to a user, with current status so
-- renewals can be matched and access gated. Written only by the service role
-- (the webhook); users may read their own for the "Manage subscription" button.
create table if not exists public.subscriptions (
  paddle_subscription_id text primary key,
  user_id                uuid not null references auth.users(id) on delete cascade,
  paddle_customer_id     text,
  plan                   text,
  status                 text,              -- active | past_due | canceled | ...
  monthly_credits        integer,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;
create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);
-- No insert/update/delete policy: end users cannot write; the service role bypasses RLS.
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- ── ONE-TIME ×4 credit-unit migration ──────────────────────────────────────
-- Old unit: 1 credit = 1 page. New unit: generation = 4 credits. Existing
-- balances were one-time purchases → move them to persistent top-up, ×4.
-- Guarded so a re-run is a no-op (only migrates rows not yet migrated).
update public.credits
set topup_credits = balance * 4,
    balance = balance * 4
where topup_credits = 0 and monthly_credits = 0 and balance > 0;
