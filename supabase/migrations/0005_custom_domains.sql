-- Step 6 (F8): custom domains on published projects.
-- Apply in Supabase (SQL Editor) before deploying the custom-domain code.
--
-- custom_domain / domain_status / domain_checked_at are SERVER-OWNED: only
-- /api/domains (service role) writes them, after verifying the project belongs to
-- the caller and talking to Netlify. Clients can read them (to render status) but
-- not write them — same column-level protection as netlify_site_id/published_url.
--
-- domain_status:
--   'pending'   — domain added to the Netlify site; DNS does not point at it yet
--   'verifying' — DNS points at the site; HTTPS certificate still provisioning
--   'live'      — DNS points at the site AND the certificate is issued

begin;

alter table public.projects add column if not exists custom_domain     text;
alter table public.projects add column if not exists domain_status     text;
alter table public.projects add column if not exists domain_checked_at timestamptz;

alter table public.projects drop constraint if exists projects_domain_status_check;
alter table public.projects add constraint projects_domain_status_check
  check (domain_status is null or domain_status in ('pending', 'verifying', 'live'));

-- One project per domain across all users (Netlify also enforces this globally,
-- but this stops two of our own rows ever claiming the same hostname).
create unique index if not exists projects_custom_domain_key
  on public.projects (lower(custom_domain)) where custom_domain is not null;

-- Re-assert the client write grants from 0002. Column-level grants are explicit,
-- so the new columns above are NOT in them — clients cannot insert/update
-- custom_domain, domain_status or domain_checked_at. (Idempotent; listed here so
-- the protection is visible next to the new columns.)
revoke insert, update on public.projects from authenticated;
grant insert (user_id, business_name, industry, html, source_url, hero_url, is_public) on public.projects to authenticated;
grant update (business_name, industry, html, source_url, hero_url, is_public) on public.projects to authenticated;

commit;

-- Verify (read-only): authenticated must have NO insert/update on the new columns.
-- Expect zero rows.
-- select grantee, privilege_type, column_name
-- from information_schema.column_privileges
-- where table_schema = 'public' and table_name = 'projects'
--   and grantee in ('authenticated', 'anon')
--   and privilege_type in ('INSERT', 'UPDATE')
--   and column_name in ('custom_domain', 'domain_status', 'domain_checked_at',
--                       'netlify_site_id', 'published_url');
