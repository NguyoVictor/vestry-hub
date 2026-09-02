begin;

create or replace function private.get_staff_tenant_id()
returns varchar
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select u.tenant_id
  from public.users u
  where u.id = (select auth.uid())::text
    and u.status = 'active'
  limit 1;
$$;
revoke all on function private.get_staff_tenant_id() from public, anon;
grant execute on function private.get_staff_tenant_id() to authenticated, service_role;

create or replace function public.get_my_tenant_id_safe()
returns varchar language sql stable security invoker
set search_path = public, private, pg_temp
as $$ select private.get_staff_tenant_id(); $$;

create or replace function public.get_my_tenant_id()
returns varchar language sql stable security invoker
set search_path = public, private, pg_temp
as $$ select private.get_staff_tenant_id(); $$;

revoke all on function public.get_my_tenant_id() from public, anon;
revoke all on function public.get_my_tenant_id_safe() from public, anon;
grant execute on function public.get_my_tenant_id() to authenticated, service_role;
grant execute on function public.get_my_tenant_id_safe() to authenticated, service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_member_for_user() from public, anon, authenticated;
revoke all on function public.create_default_subscription() from public, anon, authenticated;
revoke all on function public.trigger_email_automation() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.create_member_for_user() to service_role;
grant execute on function public.create_default_subscription() to service_role;
grant execute on function public.trigger_email_automation() to service_role;

alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.update_canva_tokens_updated_at() set search_path = public, pg_temp;
alter function public.generate_order_number() set search_path = public, pg_temp;
alter function public.post_auto_journal_entry(varchar, text, varchar, date, jsonb) set search_path = public, pg_temp;
alter function public.create_default_subscription() set search_path = public, pg_temp;

drop trigger if exists trigger_member_automation_insert on public.members;
drop trigger if exists trigger_member_automation_update on public.members;

create or replace function public.trigger_email_automation()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$ begin return coalesce(new, old); end; $$;
revoke all on function public.trigger_email_automation() from public, anon, authenticated;
grant execute on function public.trigger_email_automation() to service_role;

revoke all on public.automation_settings from anon, authenticated;
grant all on public.automation_settings to service_role;
delete from public.automation_settings where key = 'service_role_key';

create or replace function public.batch_increment_unread_count(p_conversation_id text, p_excluding_user_id text)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$ select null::void; $$;
revoke all on function public.batch_increment_unread_count(text, text) from public, anon, authenticated;
grant execute on function public.batch_increment_unread_count(text, text) to service_role;

create or replace function public.get_active_sessions_for_tenant(p_tenant_id text)
returns table(user_id text, session_created_at timestamptz, last_active timestamptz, ip_address text, user_agent text, first_name text, last_name text, role text, email text)
language sql security definer
set search_path = public, auth, pg_temp
as $$
  select distinct on (s.user_id::text)
    s.user_id::text, s.created_at, s.updated_at, s.ip::text, s.user_agent,
    u.first_name::text, u.last_name::text, u.role::text, u.email::text
  from auth.sessions s
  join public.users u on s.user_id::text = u.id
  where u.tenant_id = p_tenant_id and u.status = 'active'
  order by s.user_id::text, s.updated_at desc nulls last;
$$;
revoke all on function public.get_active_sessions_for_tenant(text) from public, anon, authenticated;
grant execute on function public.get_active_sessions_for_tenant(text) to service_role;

commit;;
