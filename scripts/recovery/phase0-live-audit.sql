-- READ-ONLY: Execute ONLY against Vestry Hub staging (project xwbajophstetbnnemsyq).
-- Returns metadata only; no user rows, JWTs, tokens, storage objects or secrets.
-- No INSERT, UPDATE, DELETE, DDL or migration-history repair.

select current_database() as database_name,
       current_user as connection_role,
       current_setting('server_version') as postgres_version;

select
  count(*) filter (where c.relkind in ('r','p'))::int as public_tables,
  count(*) filter (where c.relkind in ('r','p') and c.relrowsecurity)::int as rls_enabled,
  count(*) filter (where c.relkind in ('r','p') and not c.relrowsecurity)::int as rls_disabled,
  count(*) filter (where c.relkind in ('v','m'))::int as public_views
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v','m');

select count(*)::int as public_routines,
       count(*) filter (where p.prosecdef)::int as security_definer_routines
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public';

with refs(name,required) as (values
  ('fellowship_members',true),('visitors',true),('families',true),('member_sessions',true),
  ('ledger_entries',true),('accounts_payable',true),('expenses',true),('payouts',true),
  ('chart_of_accounts',true)
)
select name,required,to_regclass(format('public.%I',name)) is not null as present
from refs order by name;

select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='fellowship_members'
order by ordinal_position;

select n.nspname as schema_name,p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='seed_chart_of_accounts';

select id as bucket_name, public, file_size_limit
from storage.buckets order by id;

select relname as table_name
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
  and c.relrowsecurity and not exists(select 1 from pg_policy p where p.polrelid=c.oid)
order by relname;

-- Privileged function exposure: check against app authorization logic before changes.
select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as routine,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
  and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))
order by 1;
