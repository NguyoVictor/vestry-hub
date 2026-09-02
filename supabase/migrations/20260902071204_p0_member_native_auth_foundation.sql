begin;

create table if not exists public.member_auth_memberships (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  member_id varchar not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  unique (member_id),
  unique (auth_user_id, tenant_id, member_id)
);

create index if not exists idx_member_auth_memberships_auth_tenant
  on public.member_auth_memberships(auth_user_id, tenant_id);
create index if not exists idx_member_auth_memberships_tenant_member
  on public.member_auth_memberships(tenant_id, member_id);

alter table public.member_auth_memberships enable row level security;
revoke all on public.member_auth_memberships from public, anon, authenticated;
grant select on public.member_auth_memberships to authenticated;
grant all on public.member_auth_memberships to service_role;

drop policy if exists member_auth_memberships_own_read on public.member_auth_memberships;
create policy member_auth_memberships_own_read
on public.member_auth_memberships
for select
to authenticated
using (auth_user_id = (select auth.uid()));

create table if not exists public.member_login_challenges (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  member_id varchar not null references public.members(id) on delete cascade,
  email_normalized text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz null,
  request_count integer not null default 1,
  constraint member_login_challenges_email_nonblank check (length(trim(email_normalized)) > 3)
);
create index if not exists idx_member_login_challenges_rate
  on public.member_login_challenges(tenant_id, email_normalized, created_at desc);
create index if not exists idx_member_login_challenges_active
  on public.member_login_challenges(id, expires_at)
  where consumed_at is null;

alter table public.member_login_challenges enable row level security;
revoke all on public.member_login_challenges from public, anon, authenticated;
grant all on public.member_login_challenges to service_role;

insert into public.member_auth_memberships(auth_user_id, tenant_id, member_id)
select au.id, m.tenant_id, m.id
from public.members m
join auth.users au on au.id::text = m.user_id
where m.user_id is not null
on conflict (member_id) do nothing;

create or replace function private.member_has_tenant(p_tenant_id varchar)
returns boolean
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.member_auth_memberships mam
    where mam.auth_user_id = (select auth.uid())
      and mam.tenant_id = p_tenant_id
  );
$$;
revoke all on function private.member_has_tenant(varchar) from public, anon;
grant execute on function private.member_has_tenant(varchar) to authenticated, service_role;

create or replace function private.member_has_member(p_member_id varchar)
returns boolean
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.member_auth_memberships mam
    where mam.auth_user_id = (select auth.uid())
      and mam.member_id = p_member_id
  );
$$;
revoke all on function private.member_has_member(varchar) from public, anon;
grant execute on function private.member_has_member(varchar) to authenticated, service_role;

create or replace function private.member_actor_matches(p_actor_id varchar, p_tenant_id varchar)
returns boolean
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select (
    p_actor_id = (select auth.uid())::text
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
    )
  ) or exists (
    select 1
    from public.member_auth_memberships mam
    where mam.auth_user_id = (select auth.uid())
      and mam.tenant_id = p_tenant_id
      and mam.member_id = p_actor_id
  );
$$;
revoke all on function private.member_actor_matches(varchar, varchar) from public, anon;
grant execute on function private.member_actor_matches(varchar, varchar) to authenticated, service_role;

create or replace function private.protect_member_security_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_staff_allowed boolean := false;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())::text
      and u.tenant_id = old.tenant_id
      and u.status = 'active'
      and (u.is_super_admin = true or lower(coalesce(u.role, '')) not in ('member', 'guest'))
  ) into v_staff_allowed;

  if v_staff_allowed or private.is_platform_super_admin() then
    return new;
  end if;

  if not private.member_has_member(old.id) then
    raise exception 'Member profile access denied.' using errcode = '42501';
  end if;

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
    raise exception 'Administrative member fields cannot be changed from the Member Portal.' using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke all on function private.protect_member_security_fields() from public, anon, authenticated;

drop trigger if exists protect_member_security_fields on public.members;
create trigger protect_member_security_fields
before update on public.members
for each row execute function private.protect_member_security_fields();

drop policy if exists members_member_auth_read on public.members;
create policy members_member_auth_read
on public.members
for select
to authenticated
using (private.member_has_member(id));

drop policy if exists members_member_auth_update on public.members;
create policy members_member_auth_update
on public.members
for update
to authenticated
using (private.member_has_member(id))
with check (private.member_has_member(id));

-- Add the secure native-auth policies now; legacy anon policies are removed only
-- after the frontend switches away from member_sessions.
drop policy if exists notifications_member_auth_read on public.notifications;
create policy notifications_member_auth_read
on public.notifications
for select
to authenticated
using (
  user_id = (select auth.uid())::text
  or exists (
    select 1 from public.member_auth_memberships mam
    where mam.auth_user_id = (select auth.uid())
      and mam.tenant_id = notifications.tenant_id
      and mam.member_id = notifications.user_id
  )
);

drop policy if exists notifications_member_auth_update on public.notifications;
create policy notifications_member_auth_update
on public.notifications
for update
to authenticated
using (
  user_id = (select auth.uid())::text
  or exists (
    select 1 from public.member_auth_memberships mam
    where mam.auth_user_id = (select auth.uid())
      and mam.tenant_id = notifications.tenant_id
      and mam.member_id = notifications.user_id
  )
)
with check (
  user_id = (select auth.uid())::text
  or exists (
    select 1 from public.member_auth_memberships mam
    where mam.auth_user_id = (select auth.uid())
      and mam.tenant_id = notifications.tenant_id
      and mam.member_id = notifications.user_id
  )
);

drop policy if exists device_tokens_member_auth_read on public.device_tokens;
create policy device_tokens_member_auth_read
on public.device_tokens
for select
to authenticated
using (private.member_actor_matches(user_id, tenant_id));

drop policy if exists device_tokens_member_auth_insert on public.device_tokens;
create policy device_tokens_member_auth_insert
on public.device_tokens
for insert
to authenticated
with check (private.member_actor_matches(user_id, tenant_id));

drop policy if exists device_tokens_member_auth_update on public.device_tokens;
create policy device_tokens_member_auth_update
on public.device_tokens
for update
to authenticated
using (private.member_actor_matches(user_id, tenant_id))
with check (private.member_actor_matches(user_id, tenant_id));

drop policy if exists device_tokens_member_auth_delete on public.device_tokens;
create policy device_tokens_member_auth_delete
on public.device_tokens
for delete
to authenticated
using (private.member_actor_matches(user_id, tenant_id));

drop policy if exists reactions_member_auth_read on public.message_reactions;
create policy reactions_member_auth_read
on public.message_reactions
for select
to authenticated
using (private.member_has_tenant(tenant_id));

drop policy if exists reactions_member_auth_insert on public.message_reactions;
create policy reactions_member_auth_insert
on public.message_reactions
for insert
to authenticated
with check (private.member_actor_matches(user_id, tenant_id));

drop policy if exists reactions_member_auth_update on public.message_reactions;
create policy reactions_member_auth_update
on public.message_reactions
for update
to authenticated
using (private.member_actor_matches(user_id, tenant_id))
with check (private.member_actor_matches(user_id, tenant_id));

drop policy if exists reactions_member_auth_delete on public.message_reactions;
create policy reactions_member_auth_delete
on public.message_reactions
for delete
to authenticated
using (private.member_actor_matches(user_id, tenant_id));

commit;;
