begin;

drop policy if exists tenant_self_insert on public.tenants;
drop policy if exists tenants_admin_access on public.tenants;
drop policy if exists tenant_self_write on public.tenants;
drop policy if exists tenant_self_update on public.tenants;

revoke insert, delete on public.tenants from authenticated;

drop policy if exists tenants_authenticated_update on public.tenants;
create policy tenants_authenticated_update
on public.tenants
for update
to authenticated
using (
  private.is_platform_super_admin()
  or exists (
    select 1 from public.users u
    where u.id = (select auth.uid())::text
      and u.tenant_id = tenants.id
      and u.status = 'active'
      and lower(coalesce(u.role,'')) in ('super_admin','church_admin')
  )
)
with check (
  private.is_platform_super_admin()
  or exists (
    select 1 from public.users u
    where u.id = (select auth.uid())::text
      and u.tenant_id = tenants.id
      and u.status = 'active'
      and lower(coalesce(u.role,'')) in ('super_admin','church_admin')
  )
);

commit;;
