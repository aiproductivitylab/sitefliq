-- Read-only diagnostics. Run in Supabase Dashboard -> SQL Editor.
-- Nothing here modifies data; it only reports schema + RLS state so we can
-- confirm users cannot update their own credit balance.

-- (a) Columns of the `credits` table (verify it is keyed by user_id + has balance).
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'credits'
order by ordinal_position;

-- (b1) Is Row-Level Security ENABLED on credits and transactions?
--      relrowsecurity must be true for the policies below to be enforced.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('credits', 'transactions');

-- (b2) All RLS policies on credits and transactions.
--      Confirm there is NO policy with cmd = 'UPDATE' (or 'ALL') granting
--      authenticated/anon users write access to their own balance. Ideally
--      credits has only a SELECT policy for the owner, and all writes go through
--      the service-role RPCs / webhook.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('credits', 'transactions')
order by tablename, cmd, policyname;

-- (c) Bonus: who can EXECUTE the credit functions? After the migration, only
--     service_role should appear (plus the function owner). No anon/authenticated.
select p.proname as function_name,
       pg_get_userbyid(p.proowner) as owner,
       coalesce(array_to_string(p.proacl, E'\n'), '(default: PUBLIC)') as grants
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('add_credits', 'deduct_credits', 'deduct_credit')
order by p.proname;
