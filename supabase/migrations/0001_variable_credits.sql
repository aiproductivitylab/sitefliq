-- Step 1: variable-cost credits, audit ledger, rate limiting, and function lockdown.
--
-- Apply this in the Supabase project (Dashboard -> SQL Editor) BEFORE deploying
-- any server code that calls deduct_credits() / rate_events, or generation and
-- publish will fail.
--
-- ASSUMPTION to verify: the existing `credits` table is keyed by `user_id (uuid)`
-- with an integer `balance` column (that's what src/store.js getCredits/RPCs
-- imply). If your column is named differently, adjust the UPDATE below to match.
-- Run supabase/security_checks.sql to confirm the schema and RLS policies.

-- 1. Append-only audit ledger for every credit movement.
create table if not exists public.credit_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  delta       integer not null,   -- negative = debit, positive = credit
  reason      text not null,      -- 'generation' | 'edit' | 'lead_search' | 'topup' | 'subscription_refill' | 'refund'
  ref_id      text,               -- optional: paddle txn id, project id, etc.
  created_at  timestamptz not null default now()
);

create index if not exists credit_ledger_user_id_idx
  on public.credit_ledger(user_id, created_at desc);

alter table public.credit_ledger enable row level security;

-- Users may read their own ledger; writes happen only via SECURITY DEFINER RPCs
-- and the service-role webhook, so no INSERT policy is granted to end users.
create policy credit_ledger_select_own on public.credit_ledger
  for select using (auth.uid() = user_id);

-- 2. Atomic variable-amount debit.
--    Returns the new balance, or raises 'insufficient_credits' if too low.
--    The balance check and decrement happen in one UPDATE, so two concurrent
--    requests can't both pass the check and overdraw.
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
  new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.credits
     set balance = balance - p_amount
   where user_id = p_user_id
     and balance >= p_amount
  returning balance into new_balance;

  if new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger(user_id, delta, reason, ref_id)
  values (p_user_id, -p_amount, p_reason, p_ref_id);

  return new_balance;
end;
$$;

-- Note: refunds (on a failed generation) reuse the existing add_credits RPC.
-- Extending add_credits to also write a positive credit_ledger row (reason
-- 'refund' / 'subscription_refill' / 'topup') is a small follow-up so the ledger
-- captures credits as well as debits -- left out here to avoid changing the
-- webhook's current behaviour in the same step.

-- 3. Durable per-user rate limiting. Serverless functions can't hold reliable
--    in-memory counters, so we record one row per throttled action and count
--    recent rows within the window. Only the service role touches this table.
create table if not exists public.rate_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  action      text not null,      -- 'generate' | 'publish'
  created_at  timestamptz not null default now()
);

create index if not exists rate_events_lookup_idx
  on public.rate_events(user_id, action, created_at desc);

alter table public.rate_events enable row level security;
-- No policies granted: anon/authenticated get no access; the service role
-- (which bypasses RLS) is the only reader/writer. Old rows can be purged
-- periodically (e.g. a scheduled job deleting rows older than a day).

-- 4. Function lockdown. By default Postgres grants EXECUTE on new functions to
--    PUBLIC, which would let a logged-in user call add_credits() and mint their
--    own balance. Revoke from everyone except the service role. The DO block
--    matches each function by name regardless of its exact argument signature.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_credits', 'deduct_credits', 'deduct_credit')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

-- 5. Remove the UPDATE policy that let any authenticated user set their own
--    credits.balance to an arbitrary value (using/check auth.uid() = user_id).
--    All balance writes now go through the service-role RPCs (deduct_credits /
--    add_credits), which bypass RLS, so end users need no UPDATE access at all.
--    The SELECT policy on `credits` is left intact (the client reads its balance).
drop policy if exists "Users can only deduct own credits" on public.credits;
