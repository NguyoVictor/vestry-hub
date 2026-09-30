begin;

-- P1 people permission parity
-- Keep read access tenant-scoped while enforcing the UI's read_only/full_access
-- contract at the database write boundary.

create or replace function private.can_manage_permissions(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_super_admin()
    or exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
        and lower(coalesce(u.role, '')) in ('super_admin', 'church_admin')
    );
$$;

revoke all on function private.can_manage_permissions(text) from public, anon;
grant execute on function private.can_manage_permissions(text) to authenticated, service_role;

create or replace function private.can_write_permission(p_tenant_id text, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_super_admin()
    or exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
        and (
          lower(coalesce(u.role, '')) in ('super_admin', 'church_admin')
          or coalesce(
            (
              select ufp.level
              from public.user_fine_permissions ufp
              where ufp.user_id = u.id
                and ufp.tenant_id = p_tenant_id
                and ufp.permission_key = p_permission_key
              limit 1
            ),
            'default'
          ) <> 'read_only'
        )
    );
$$;

revoke all on function private.can_write_permission(text, text) from public, anon;
grant execute on function private.can_write_permission(text, text) to authenticated, service_role;

create or replace function private.can_manage_people(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_write_permission(p_tenant_id, 'member_management');
$$;

revoke all on function private.can_manage_people(text) from public, anon;
grant execute on function private.can_manage_people(text) to authenticated, service_role;

create or replace function private.can_manage_groups(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_write_permission(p_tenant_id, 'groups_ministries')
    or private.can_write_permission(p_tenant_id, 'member_management');
$$;

revoke all on function private.can_manage_groups(text) from public, anon;
grant execute on function private.can_manage_groups(text) to authenticated, service_role;

drop policy if exists "ufp_tenant" on public.user_fine_permissions;
drop policy if exists "ufp_read" on public.user_fine_permissions;
drop policy if exists "ufp_insert" on public.user_fine_permissions;
drop policy if exists "ufp_update" on public.user_fine_permissions;
drop policy if exists "ufp_delete" on public.user_fine_permissions;

create policy "ufp_read" on public.user_fine_permissions
for select to authenticated
using (
  user_id = (select auth.uid())::text
  or private.can_manage_permissions(tenant_id)
);

create policy "ufp_insert" on public.user_fine_permissions
for insert to authenticated
with check (private.can_manage_permissions(tenant_id));

create policy "ufp_update" on public.user_fine_permissions
for update to authenticated
using (private.can_manage_permissions(tenant_id))
with check (private.can_manage_permissions(tenant_id));

create policy "ufp_delete" on public.user_fine_permissions
for delete to authenticated
using (private.can_manage_permissions(tenant_id));

drop policy if exists "members_tenant_isolation" on public.members;
drop policy if exists "members_tenant_write" on public.members;
drop policy if exists "members_staff_insert" on public.members;
drop policy if exists "members_staff_update" on public.members;
drop policy if exists "members_staff_delete" on public.members;

create policy "members_staff_insert" on public.members
for insert to authenticated
with check (private.can_manage_people(tenant_id));
create policy "members_staff_update" on public.members
for update to authenticated
using (private.can_manage_people(tenant_id))
with check (private.can_manage_people(tenant_id));
create policy "members_staff_delete" on public.members
for delete to authenticated
using (private.can_manage_people(tenant_id));

drop policy if exists "families_tenant_isolation" on public.families;
drop policy if exists "families_tenant_write" on public.families;
drop policy if exists "families_staff_insert" on public.families;
drop policy if exists "families_staff_update" on public.families;
drop policy if exists "families_staff_delete" on public.families;
create policy "families_staff_insert" on public.families
for insert to authenticated with check (private.can_manage_people(tenant_id));
create policy "families_staff_update" on public.families
for update to authenticated using (private.can_manage_people(tenant_id))
with check (private.can_manage_people(tenant_id));
create policy "families_staff_delete" on public.families
for delete to authenticated using (private.can_manage_people(tenant_id));

drop policy if exists "fam_members_rls" on public.family_members;
drop policy if exists "family_members_tenant_read" on public.family_members;
drop policy if exists "family_members_staff_insert" on public.family_members;
drop policy if exists "family_members_staff_update" on public.family_members;
drop policy if exists "family_members_staff_delete" on public.family_members;
create policy "family_members_tenant_read" on public.family_members
for select to authenticated
using (exists (
  select 1 from public.families f
  where f.id = family_members.family_id
    and f.tenant_id = public.get_my_tenant_id()
));
create policy "family_members_staff_insert" on public.family_members
for insert to authenticated
with check (exists (
  select 1 from public.families f
  where f.id = family_members.family_id
    and private.can_manage_people(f.tenant_id)
));
create policy "family_members_staff_update" on public.family_members
for update to authenticated
using (exists (
  select 1 from public.families f
  where f.id = family_members.family_id
    and private.can_manage_people(f.tenant_id)
))
with check (exists (
  select 1 from public.families f
  where f.id = family_members.family_id
    and private.can_manage_people(f.tenant_id)
));
create policy "family_members_staff_delete" on public.family_members
for delete to authenticated
using (exists (
  select 1 from public.families f
  where f.id = family_members.family_id
    and private.can_manage_people(f.tenant_id)
));

do $$
declare
  t text;
begin
  foreach t in array array['visitors','follow_up_tasks','new_converts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_rls', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.get_my_tenant_id())', t || '_staff_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.can_manage_people(tenant_id))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.can_manage_people(tenant_id)) with check (private.can_manage_people(tenant_id))', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.can_manage_people(tenant_id))', t || '_staff_delete', t);
  end loop;
end $$;

drop policy if exists "groups_tenant_write" on public.groups;
drop policy if exists "groups_staff_insert" on public.groups;
drop policy if exists "groups_staff_update" on public.groups;
drop policy if exists "groups_staff_delete" on public.groups;
create policy "groups_staff_insert" on public.groups
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "groups_staff_update" on public.groups
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "groups_staff_delete" on public.groups
for delete to authenticated using (private.can_manage_groups(tenant_id));

drop policy if exists "group_members_tenant_write" on public.group_members;
drop policy if exists "group_members_member_session_read" on public.group_members;
drop policy if exists "group_members_staff_insert" on public.group_members;
drop policy if exists "group_members_staff_update" on public.group_members;
drop policy if exists "group_members_staff_delete" on public.group_members;
create policy "group_members_member_session_read" on public.group_members
for select to anon
using (private.member_session_in_group(group_id, tenant_id));
create policy "group_members_staff_insert" on public.group_members
for insert to authenticated
with check (private.can_manage_groups(tenant_id));
create policy "group_members_staff_update" on public.group_members
for update to authenticated
using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "group_members_staff_delete" on public.group_members
for delete to authenticated
using (private.can_manage_groups(tenant_id));

drop policy if exists "group_types_tenant_access" on public.group_types;
drop policy if exists "group_types_staff_read" on public.group_types;
drop policy if exists "group_types_staff_insert" on public.group_types;
drop policy if exists "group_types_staff_update" on public.group_types;
drop policy if exists "group_types_staff_delete" on public.group_types;
create policy "group_types_staff_read" on public.group_types
for select to authenticated using (tenant_id = public.get_my_tenant_id());
create policy "group_types_staff_insert" on public.group_types
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "group_types_staff_update" on public.group_types
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "group_types_staff_delete" on public.group_types
for delete to authenticated using (private.can_manage_groups(tenant_id));

drop policy if exists "hf_tenant_rls" on public.house_fellowships;
drop policy if exists "house_fellowships_staff_read" on public.house_fellowships;
drop policy if exists "house_fellowships_staff_insert" on public.house_fellowships;
drop policy if exists "house_fellowships_staff_update" on public.house_fellowships;
drop policy if exists "house_fellowships_staff_delete" on public.house_fellowships;
create policy "house_fellowships_staff_read" on public.house_fellowships
for select to authenticated using (tenant_id = public.get_my_tenant_id());
create policy "house_fellowships_staff_insert" on public.house_fellowships
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "house_fellowships_staff_update" on public.house_fellowships
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "house_fellowships_staff_delete" on public.house_fellowships
for delete to authenticated using (private.can_manage_groups(tenant_id));

drop policy if exists "fm_tenant_rls" on public.fellowship_members;
drop policy if exists "fellowship_members_staff_read" on public.fellowship_members;
drop policy if exists "fellowship_members_staff_insert" on public.fellowship_members;
drop policy if exists "fellowship_members_staff_update" on public.fellowship_members;
drop policy if exists "fellowship_members_staff_delete" on public.fellowship_members;
create policy "fellowship_members_staff_read" on public.fellowship_members
for select to authenticated using (tenant_id = public.get_my_tenant_id());
create policy "fellowship_members_staff_insert" on public.fellowship_members
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "fellowship_members_staff_update" on public.fellowship_members
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "fellowship_members_staff_delete" on public.fellowship_members
for delete to authenticated using (private.can_manage_groups(tenant_id));

drop policy if exists "join_requests_staff_manage" on public.join_requests;
drop policy if exists "join_requests_staff_read" on public.join_requests;
drop policy if exists "join_requests_staff_insert" on public.join_requests;
drop policy if exists "join_requests_staff_update" on public.join_requests;
drop policy if exists "join_requests_staff_delete" on public.join_requests;
create policy "join_requests_staff_read" on public.join_requests
for select to authenticated using (tenant_id = public.get_my_tenant_id());
create policy "join_requests_staff_insert" on public.join_requests
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "join_requests_staff_update" on public.join_requests
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "join_requests_staff_delete" on public.join_requests
for delete to authenticated using (private.can_manage_groups(tenant_id));

drop policy if exists "fellowship_attendance_staff_manage" on public.fellowship_attendance;
drop policy if exists "fellowship_attendance_staff_read" on public.fellowship_attendance;
drop policy if exists "fellowship_attendance_staff_insert" on public.fellowship_attendance;
drop policy if exists "fellowship_attendance_staff_update" on public.fellowship_attendance;
drop policy if exists "fellowship_attendance_staff_delete" on public.fellowship_attendance;
create policy "fellowship_attendance_staff_read" on public.fellowship_attendance
for select to authenticated using (tenant_id = public.get_my_tenant_id());
create policy "fellowship_attendance_staff_insert" on public.fellowship_attendance
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "fellowship_attendance_staff_update" on public.fellowship_attendance
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "fellowship_attendance_staff_delete" on public.fellowship_attendance
for delete to authenticated using (private.can_manage_groups(tenant_id));

drop policy if exists "fellowship_rsvp_staff_manage" on public.fellowship_rsvp;
drop policy if exists "fellowship_rsvp_staff_read" on public.fellowship_rsvp;
drop policy if exists "fellowship_rsvp_staff_insert" on public.fellowship_rsvp;
drop policy if exists "fellowship_rsvp_staff_update" on public.fellowship_rsvp;
drop policy if exists "fellowship_rsvp_staff_delete" on public.fellowship_rsvp;
create policy "fellowship_rsvp_staff_read" on public.fellowship_rsvp
for select to authenticated using (tenant_id = public.get_my_tenant_id());
create policy "fellowship_rsvp_staff_insert" on public.fellowship_rsvp
for insert to authenticated with check (private.can_manage_groups(tenant_id));
create policy "fellowship_rsvp_staff_update" on public.fellowship_rsvp
for update to authenticated using (private.can_manage_groups(tenant_id))
with check (private.can_manage_groups(tenant_id));
create policy "fellowship_rsvp_staff_delete" on public.fellowship_rsvp
for delete to authenticated using (private.can_manage_groups(tenant_id));

do $$
declare
  t text;
begin
  foreach t in array array['children','children_classes','children_checkins','children_qr_codes','children_ministry_settings'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_manage', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.get_my_tenant_id())', t || '_staff_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.can_manage_people(tenant_id))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.can_manage_people(tenant_id)) with check (private.can_manage_people(tenant_id))', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.can_manage_people(tenant_id))', t || '_staff_delete', t);
  end loop;
end $$;

commit;