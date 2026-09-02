begin;

create or replace function private.actor_has_tenant(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    private.is_platform_super_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
    )
    or exists (
      select 1 from public.members m
      where m.user_id = (select auth.uid())::text
        and m.tenant_id = p_tenant_id
        and coalesce(m.status, 'active') <> 'inactive'
        and coalesce(m.membership_status, 'active') <> 'Pending Approval'
    );
$$;
revoke all on function private.actor_has_tenant(text) from public, anon;
grant execute on function private.actor_has_tenant(text) to authenticated, service_role;

create or replace function private.can_manage_people(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    private.is_platform_super_admin()
    or exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
        and lower(coalesce(u.role, '')) in (
          'super_admin', 'church_admin', 'general_overseer',
          'senior_pastor', 'assistant_pastor', 'pastor'
        )
    );
$$;
revoke all on function private.can_manage_people(text) from public, anon;
grant execute on function private.can_manage_people(text) to authenticated, service_role;

commit;;
