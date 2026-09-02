begin;

alter table public.users add column if not exists is_super_admin boolean not null default false;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select coalesce((
    select u.is_super_admin
    from public.users u
    where u.id = (select auth.uid())::text
      and u.status = 'active'
    limit 1
  ), false);
$$;
revoke all on function private.is_platform_super_admin() from public, anon;
grant execute on function private.is_platform_super_admin() to authenticated, service_role;

create table if not exists public.staff_invitations (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  email varchar not null,
  role varchar not null,
  member_id varchar null references public.members(id) on delete set null,
  branch_id varchar null,
  first_name varchar null,
  last_name varchar null,
  invited_by varchar null references public.users(id) on delete set null,
  auth_user_id varchar null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint staff_invitations_email_not_blank check (length(trim(email)) > 3),
  constraint staff_invitations_role_not_blank check (length(trim(role)) > 0)
);
alter table public.staff_invitations enable row level security;
revoke all on table public.staff_invitations from public, anon, authenticated;
grant select, insert, update, delete on table public.staff_invitations to service_role;
create index if not exists idx_staff_invitations_lookup on public.staff_invitations (id, lower(email), consumed_at, expires_at);
create index if not exists idx_staff_invitations_tenant on public.staff_invitations (tenant_id, created_at desc);
create index if not exists idx_staff_invitations_auth_user on public.staff_invitations (auth_user_id) where auth_user_id is not null;

create or replace function private.protect_user_security_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if (select auth.uid()) is null or private.is_platform_super_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.is_super_admin is distinct from old.is_super_admin
     or new.email is distinct from old.email
     or new.email_verified is distinct from old.email_verified
     or new.phone_verified is distinct from old.phone_verified
     or new.mfa_enabled is distinct from old.mfa_enabled
     or new.invitation_sent is distinct from old.invitation_sent
     or new.last_login_at is distinct from old.last_login_at then
    raise exception 'Security-sensitive user fields may only be changed by an authorized server action.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_user_security_fields() from public, anon, authenticated;
drop trigger if exists protect_user_security_fields on public.users;
create trigger protect_user_security_fields before update on public.users for each row execute function private.protect_user_security_fields();

drop policy if exists handle_new_user_insert on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_self_access on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_self_profile_update on public.users;
create policy users_self_profile_update on public.users for update to authenticated
using (id = (select auth.uid())::text)
with check (id = (select auth.uid())::text);
drop policy if exists users_platform_super_admin_all on public.users;
create policy users_platform_super_admin_all on public.users for all to authenticated
using (private.is_platform_super_admin())
with check (private.is_platform_super_admin());

drop trigger if exists auto_create_member_trigger on public.users;

create or replace function public.create_member_for_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_member_id varchar;
begin
  select si.member_id into v_member_id
  from public.staff_invitations si
  where si.auth_user_id = new.id and si.consumed_at is not null
  order by si.consumed_at desc limit 1;

  if v_member_id is not null then
    update public.members set user_id = new.id, updated_at = now()
    where id = v_member_id and tenant_id = new.tenant_id;
    if not found then
      raise exception 'Invited member does not belong to invitation tenant.' using errcode = '23503';
    end if;
    return new;
  end if;

  insert into public.members (
    id, tenant_id, user_id, first_name, last_name, email, phone,
    status, member_type, registration_source, avatar_url, join_date,
    membership_number, created_at, updated_at
  ) values (
    new.id, new.tenant_id, new.id,
    coalesce(new.first_name, 'Admin'), coalesce(new.last_name, 'User'),
    new.email, new.phone,
    case when new.status = 'active' then 'active' else 'inactive' end,
    'member', 'admin', new.avatar_url, coalesce(new.join_date, current_date),
    'MEM-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || upper(substring(new.id::text, 1, 4)),
    now(), now()
  ) on conflict (id) do update set
    user_id = excluded.user_id,
    tenant_id = excluded.tenant_id,
    updated_at = now();
  return new;
end;
$$;
revoke all on function public.create_member_for_user() from public, anon, authenticated;
grant execute on function public.create_member_for_user() to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id varchar;
  v_church_code varchar;
  v_full_name text;
  v_first_name varchar;
  v_last_name varchar;
  v_now timestamptz;
  v_invitation_id varchar;
  v_invitation public.staff_invitations%rowtype;
begin
  if exists (select 1 from public.users where id = new.id::text) then return new; end if;
  v_now := now();
  v_invitation_id := nullif(trim(coalesce(new.raw_app_meta_data->>'staff_invitation_id', '')), '');

  if v_invitation_id is not null then
    select si.* into v_invitation
    from public.staff_invitations si
    where si.id = v_invitation_id
      and lower(si.email) = lower(coalesce(new.email, ''))
      and si.consumed_at is null
      and si.expires_at > v_now
    limit 1 for update;
    if not found then raise exception 'Invalid or expired staff invitation.' using errcode = '28000'; end if;

    update public.staff_invitations set consumed_at = v_now, auth_user_id = new.id::text where id = v_invitation.id;
    insert into public.users (
      id, tenant_id, email, first_name, last_name, role, status, is_super_admin,
      avatar_url, join_date, created_at, updated_at, email_verified, invitation_sent
    ) values (
      new.id::text, v_invitation.tenant_id, coalesce(new.email, v_invitation.email),
      coalesce(nullif(v_invitation.first_name, ''), 'Staff'),
      coalesce(nullif(v_invitation.last_name, ''), 'User'),
      v_invitation.role, 'active', false,
      coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
      v_now::date, v_now, v_now, new.email_confirmed_at is not null, true
    );
    return new;
  end if;

  v_tenant_id := gen_random_uuid()::text;
  v_church_code := upper(substring(md5(random()::text) from 1 for 4) || substring(md5(random()::text) from 1 for 4));
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_first_name := coalesce(new.raw_user_meta_data->>'given_name', nullif(split_part(v_full_name, ' ', 1), ''), 'Admin');
  v_last_name := coalesce(new.raw_user_meta_data->>'family_name', nullif(trim(substring(v_full_name from position(' ' in v_full_name) + 1)), ''), 'User');

  insert into public.tenants (
    id, slug, name, church_code, subscription_plan, subscription_tier, subscription_status,
    onboarding_completed, onboarding_step, created_at, updated_at
  ) values (
    v_tenant_id, lower(v_church_code), v_first_name || '''s Church', v_church_code,
    'free', 'free', 'trial', false, 0, v_now, v_now
  );

  insert into public.users (
    id, tenant_id, email, first_name, last_name, role, status, is_super_admin,
    avatar_url, join_date, created_at, updated_at, email_verified
  ) values (
    new.id::text, v_tenant_id, coalesce(new.email, ''), v_first_name, v_last_name,
    'super_admin', 'active', false,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    v_now::date, v_now, v_now, new.email_confirmed_at is not null
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

commit;;
