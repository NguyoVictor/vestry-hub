-- P1 PEOPLE MEMBER SESSION POLICIES
alter table public.group_members add column if not exists tenant_id varchar;
update public.group_members gm set tenant_id=g.tenant_id from public.groups g where g.id=gm.group_id and gm.tenant_id is null;
alter table public.group_members alter column tenant_id set not null;

do $$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.group_members'::regclass and conname='group_members_group_tenant_fkey') then
    alter table public.group_members add constraint group_members_group_tenant_fkey
      foreign key(group_id,tenant_id) references public.groups(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.group_members'::regclass and conname='group_members_member_tenant_fkey') then
    alter table public.group_members add constraint group_members_member_tenant_fkey
      foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade;
  end if;
end $$;
create index if not exists group_members_tenant_group_idx on public.group_members(tenant_id,group_id);
create index if not exists group_members_member_tenant_idx on public.group_members(member_id,tenant_id);

create or replace function private.member_session_in_group(p_group_id varchar,p_tenant_id varchar)
returns boolean language sql stable security definer set search_path=public,private,pg_temp as $$
  select exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.tenant_id=p_tenant_id and gm.member_id=private.member_session_member_id(p_tenant_id));
$$;
create or replace function private.member_session_in_fellowship(p_fellowship_id varchar,p_tenant_id varchar)
returns boolean language sql stable security definer set search_path=public,private,pg_temp as $$
  select exists(select 1 from public.fellowship_members fm where fm.fellowship_id=p_fellowship_id and fm.tenant_id=p_tenant_id and fm.member_id=private.member_session_member_id(p_tenant_id));
$$;
revoke all on function private.member_session_in_group(varchar,varchar) from public,anon,authenticated;
revoke all on function private.member_session_in_fellowship(varchar,varchar) from public,anon,authenticated;
grant execute on function private.member_session_in_group(varchar,varchar) to anon,authenticated,service_role;
grant execute on function private.member_session_in_fellowship(varchar,varchar) to anon,authenticated,service_role;

revoke insert,update,delete on table public.groups from anon;
revoke insert,update,delete on table public.group_members from anon;
revoke insert,update,delete on table public.house_fellowships from anon;
revoke insert,update,delete on table public.fellowship_members from anon;
revoke insert,delete on table public.members from anon;
grant select on table public.groups to anon;
grant select on table public.group_members to anon;
grant select on table public.house_fellowships to anon;
grant select on table public.fellowship_members to anon;
grant select,update on table public.members to anon;

drop policy if exists groups_member_session_read on public.groups;
create policy groups_member_session_read on public.groups for select to anon using(
  private.member_session_has_tenant(tenant_id) and is_active=true and
  (coalesce(visibility,'private')='public' or private.member_session_in_group(id,tenant_id))
);
drop policy if exists group_members_member_session_read on public.group_members;
create policy group_members_member_session_read on public.group_members for select to anon using(
  private.member_session_has_tenant(tenant_id) and (
    private.member_session_in_group(group_id,tenant_id) or
    exists(select 1 from public.groups g where g.id=group_members.group_id and g.tenant_id=group_members.tenant_id and g.is_active=true and coalesce(g.visibility,'private')='public')
  )
);
drop policy if exists house_fellowships_member_session_read on public.house_fellowships;
create policy house_fellowships_member_session_read on public.house_fellowships for select to anon
using(private.member_session_in_fellowship(id,tenant_id));
drop policy if exists fellowship_members_member_session_read on public.fellowship_members;
create policy fellowship_members_member_session_read on public.fellowship_members for select to anon
using(private.member_session_in_fellowship(fellowship_id,tenant_id));
drop policy if exists members_member_session_read on public.members;
create policy members_member_session_read on public.members for select to anon
using(id=private.member_session_member_id(tenant_id));
drop policy if exists members_member_session_update on public.members;
create policy members_member_session_update on public.members for update to anon
using(id=private.member_session_member_id(tenant_id))
with check(id=private.member_session_member_id(tenant_id));

create or replace function private.protect_member_security_fields()
returns trigger language plpgsql security invoker set search_path=public,private,pg_temp as $$
declare v_staff_allowed boolean:=false; v_session_member varchar;
begin
  if (select auth.uid()) is null then
    v_session_member:=private.member_session_member_id(old.tenant_id);
    if v_session_member is null or v_session_member<>old.id then
      raise exception 'Member profile access denied.' using errcode='42501';
    end if;
    if new.id is distinct from old.id
      or new.tenant_id is distinct from old.tenant_id
      or new.user_id is distinct from old.user_id
      or new.email is distinct from old.email
      or (new.status is distinct from old.status and not (new.status='inactive' and old.status<>'inactive'))
      or new.member_type is distinct from old.member_type
      or new.membership_status is distinct from old.membership_status
      or new.membership_number is distinct from old.membership_number
      or new.registration_source is distinct from old.registration_source
      or new.join_date is distinct from old.join_date
      or new.department is distinct from old.department
      or new.discipleship_stage is distinct from old.discipleship_stage
      or new.salvation_date is distinct from old.salvation_date
      or new.baptism_date is distinct from old.baptism_date
      or new.baptized is distinct from old.baptized
      or new.notes is distinct from old.notes
      or new.pastoral_notes is distinct from old.pastoral_notes
      or new.is_counselor is distinct from old.is_counselor
      or new.family_id is distinct from old.family_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Administrative member fields cannot be changed from the Member Portal.' using errcode='42501';
    end if;
    return new;
  end if;

  select exists(select 1 from public.users u where u.id=(select auth.uid())::text and u.tenant_id=old.tenant_id and u.status='active' and (u.is_super_admin=true or lower(coalesce(u.role,'')) not in ('member','guest'))) into v_staff_allowed;
  if v_staff_allowed or private.is_platform_super_admin() then return new; end if;
  if not private.member_has_member(old.id) then raise exception 'Member profile access denied.' using errcode='42501'; end if;
  if new.id is distinct from old.id
    or new.tenant_id is distinct from old.tenant_id
    or new.user_id is distinct from old.user_id
    or new.email is distinct from old.email
    or new.status is distinct from old.status
    or new.member_type is distinct from old.member_type
    or new.membership_status is distinct from old.membership_status
    or new.membership_number is distinct from old.membership_number
    or new.registration_source is distinct from old.registration_source
    or new.join_date is distinct from old.join_date
    or new.department is distinct from old.department
    or new.discipleship_stage is distinct from old.discipleship_stage
    or new.salvation_date is distinct from old.salvation_date
    or new.baptism_date is distinct from old.baptism_date
    or new.baptized is distinct from old.baptized
    or new.notes is distinct from old.notes
    or new.pastoral_notes is distinct from old.pastoral_notes
    or new.is_counselor is distinct from old.is_counselor
    or new.family_id is distinct from old.family_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Administrative member fields cannot be changed from the Member Portal.' using errcode='42501';
  end if;
  return new;
end;
$$;

create or replace function public.get_member_directory_profiles(p_tenant_id varchar,p_member_ids varchar[])
returns table(id varchar,first_name varchar,last_name varchar,avatar_url varchar)
language sql stable security definer set search_path=public,private,pg_temp as $$
  with actor as (select private.member_session_member_id(p_tenant_id) as member_id)
  select m.id,m.first_name,m.last_name,m.avatar_url
  from public.members m,actor a
  where a.member_id is not null and m.tenant_id=p_tenant_id
    and m.id=any(coalesce(p_member_ids,array[]::varchar[]))
    and (
      m.id=a.member_id
      or exists(select 1 from public.group_members mine join public.group_members theirs on theirs.group_id=mine.group_id and theirs.tenant_id=mine.tenant_id where mine.tenant_id=p_tenant_id and mine.member_id=a.member_id and theirs.member_id=m.id)
      or exists(select 1 from public.fellowship_members mine join public.fellowship_members theirs on theirs.fellowship_id=mine.fellowship_id and theirs.tenant_id=mine.tenant_id where mine.tenant_id=p_tenant_id and mine.member_id=a.member_id and theirs.member_id=m.id)
      or exists(select 1 from public.group_members gm join public.groups g on g.id=gm.group_id and g.tenant_id=gm.tenant_id where gm.tenant_id=p_tenant_id and gm.member_id=m.id and g.is_active=true and coalesce(g.visibility,'private')='public')
    );
$$;
revoke all on function public.get_member_directory_profiles(varchar,varchar[]) from public,authenticated;
grant execute on function public.get_member_directory_profiles(varchar,varchar[]) to anon,authenticated,service_role;
