-- Step 4: saved projects + shareable client preview links.
-- Apply in the Supabase project (Dashboard -> SQL Editor) before deploying the
-- Step 4 code.

create extension if not exists pgcrypto;   -- gen_random_uuid()

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  business_name   text,
  industry        text,
  html            text,
  source_url      text,          -- their old site (from the importer), for before/after
  hero_url        text,          -- current hero image URL
  share_token     uuid not null unique default gen_random_uuid(),
  is_public       boolean not null default true,   -- link-shareable; the token is the secret
  netlify_site_id text,
  published_url   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id, created_at desc);
create index if not exists projects_share_token_idx on public.projects(share_token);

alter table public.projects enable row level security;

-- Owners have full access to their own rows; no one else can read or write them.
create policy projects_select_own on public.projects for select using (auth.uid() = user_id);
create policy projects_insert_own on public.projects for insert with check (auth.uid() = user_id);
create policy projects_update_own on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_delete_own on public.projects for delete using (auth.uid() = user_id);

-- Column-level write privileges. RLS already limits users to their OWN rows, but
-- without this a user could still set sensitive columns on those rows — e.g. point
-- netlify_site_id at another customer's Netlify site and overwrite it on republish.
-- Users may only write the "content" columns; netlify_site_id, published_url,
-- share_token, id, user_id and timestamps are set by column defaults or by the
-- server (service_role, which keeps full access and bypasses RLS).
revoke insert, update on public.projects from authenticated;
grant insert (user_id, business_name, industry, html, source_url, hero_url, is_public) on public.projects to authenticated;
grant update (business_name, industry, html, source_url, hero_url, is_public) on public.projects to authenticated;

-- Keep updated_at current on every update.
create or replace function public.projects_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.projects_touch_updated_at();

-- Public preview by share token (no login). SECURITY DEFINER so a logged-out
-- client can read exactly one public project by its token, without granting
-- anon broad SELECT on the table (which would allow enumeration).
create or replace function public.get_shared_project(p_token uuid)
returns table (business_name text, industry text, html text, source_url text, published_url text)
language sql
security definer
set search_path = public
as $$
  select business_name, industry, html, source_url, published_url
  from public.projects
  where share_token = p_token and is_public = true
  limit 1;
$$;

revoke all on function public.get_shared_project(uuid) from public;
grant execute on function public.get_shared_project(uuid) to anon, authenticated;
