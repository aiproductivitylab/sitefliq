-- Step 6 (F7): simple per-user invoicing.
-- Apply in the Supabase project (Dashboard -> SQL Editor) before deploying the
-- invoicing code. Mirrors the projects table's security approach: RLS limits users
-- to their own rows, and column-level grants stop them writing server-owned columns
-- (id, user_id, invoice_number, timestamps). invoice_number is assigned by a trigger
-- so it is unique and monotonic per user and cannot be spoofed by the client.

create extension if not exists pgcrypto;   -- gen_random_uuid()

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,  -- optional link to a built site
  invoice_number text,                        -- server-assigned per user (trigger); clients cannot write it
  client_name    text not null,
  client_email   text,
  line_items     jsonb not null default '[]'::jsonb,  -- [{description, quantity, unit_price}]
  currency       text not null default 'USD',
  subtotal       numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  status         text not null default 'draft' check (status in ('draft','sent','paid')),
  notes          text,
  issued_date    date not null default current_date,
  due_date       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists invoices_user_id_idx on public.invoices(user_id, created_at desc);

alter table public.invoices enable row level security;

-- Owners have full access to their own rows; no one else can read or write them.
create policy invoices_select_own on public.invoices for select using (auth.uid() = user_id);
create policy invoices_insert_own on public.invoices for insert with check (auth.uid() = user_id);
create policy invoices_update_own on public.invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy invoices_delete_own on public.invoices for delete using (auth.uid() = user_id);

-- Column-level write privileges (same rationale as projects). RLS already limits
-- users to their OWN rows; this additionally stops them setting server-owned columns.
-- Users may write only the "content" columns; id, user_id, invoice_number and the
-- timestamps are set by column defaults, the trigger below, or the service role.
revoke insert, update on public.invoices from authenticated;
grant insert (user_id, project_id, client_name, client_email, line_items, currency, subtotal, total, status, notes, issued_date, due_date) on public.invoices to authenticated;
grant update (project_id, client_name, client_email, line_items, currency, subtotal, total, status, notes, issued_date, due_date) on public.invoices to authenticated;

-- Assign a unique, monotonic per-user invoice number on insert. The per-user
-- advisory lock serialises concurrent inserts for the same user so two rows can't
-- claim the same number. SECURITY DEFINER so it can read the user's existing rows
-- regardless of the caller's column grants.
create or replace function public.invoices_set_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare next_n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select coalesce(max((substring(invoice_number from '([0-9]+)$'))::int), 0) + 1
    into next_n
    from public.invoices
   where user_id = new.user_id and invoice_number is not null;
  new.invoice_number := 'INV-' || lpad(next_n::text, 5, '0');
  return new;
end; $$;

drop trigger if exists invoices_number on public.invoices;
create trigger invoices_number before insert on public.invoices
  for each row execute function public.invoices_set_number();

-- Keep updated_at current on every update.
create or replace function public.invoices_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.invoices_touch_updated_at();
