
delete from public.conversation_participants cp
using public.conversations c
where c.id = cp.conversation_id
  and not exists (
    select 1 from public.users u where u.id = cp.user_id and u.tenant_id = c.tenant_id
  )
  and not exists (
    select 1 from public.members m where m.id = cp.user_id and m.tenant_id = c.tenant_id
  );

create unique index if not exists conversations_id_tenant_unique
  on public.conversations(id, tenant_id);

alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages alter column conversation_id set not null;

create unique index if not exists messages_id_tenant_conversation_unique
  on public.messages(id, tenant_id, conversation_id);

alter table public.messages drop constraint if exists messages_conversation_id_fkey;
alter table public.messages drop constraint if exists messages_conversation_tenant_fkey;
alter table public.messages add constraint messages_conversation_tenant_fkey
  foreign key (conversation_id, tenant_id)
  references public.conversations(id, tenant_id)
  on delete cascade;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages drop constraint if exists messages_recipient_id_fkey;

alter table public.messages drop constraint if exists messages_reply_to_id_fkey;
alter table public.messages drop constraint if exists messages_reply_conversation_tenant_fkey;
alter table public.messages add constraint messages_reply_conversation_tenant_fkey
  foreign key (reply_to_id, tenant_id, conversation_id)
  references public.messages(id, tenant_id, conversation_id)
  on delete set null (reply_to_id);

alter table public.message_reactions add column if not exists conversation_id text;
update public.message_reactions r
set conversation_id = m.conversation_id
from public.messages m
where m.id = r.message_id
  and r.conversation_id is null;
alter table public.message_reactions alter column conversation_id set not null;
alter table public.message_reactions drop constraint if exists message_reactions_message_tenant_conversation_fkey;
alter table public.message_reactions add constraint message_reactions_message_tenant_conversation_fkey
  foreign key (message_id, tenant_id, conversation_id)
  references public.messages(id, tenant_id, conversation_id)
  on delete cascade;

create or replace function private.messaging_actor_id(p_tenant_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select u.id
      from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
      limit 1
    ),
    (
      select mam.member_id
      from public.member_auth_memberships mam
      join public.members m
        on m.id = mam.member_id
       and m.tenant_id = mam.tenant_id
      where mam.auth_user_id = (select auth.uid())
        and mam.tenant_id = p_tenant_id
        and coalesce(m.status,'active') <> 'inactive'
        and coalesce(m.membership_status,'active') <> 'Pending Approval'
      limit 1
    ),
    private.member_session_member_id(p_tenant_id)
  );
$$;
revoke all on function private.messaging_actor_id(text) from public;
grant execute on function private.messaging_actor_id(text) to anon, authenticated, service_role;

create or replace function private.messaging_actor_belongs_to_tenant(p_actor_id text, p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = p_actor_id
      and u.tenant_id = p_tenant_id
      and u.status = 'active'
  ) or exists (
    select 1 from public.members m
    where m.id = p_actor_id
      and m.tenant_id = p_tenant_id
      and coalesce(m.status,'active') <> 'inactive'
      and coalesce(m.membership_status,'active') <> 'Pending Approval'
  );
$$;
revoke all on function private.messaging_actor_belongs_to_tenant(text,text) from public;
grant execute on function private.messaging_actor_belongs_to_tenant(text,text) to anon, authenticated, service_role;

create or replace function private.messaging_is_staff(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_super_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())::text
        and u.tenant_id = p_tenant_id
        and u.status = 'active'
        and length(trim(coalesce(u.role,''))) > 0
        and lower(coalesce(u.role,'')) not in ('member','guest')
    );
$$;
revoke all on function private.messaging_is_staff(text) from public, anon;
grant execute on function private.messaging_is_staff(text) to authenticated, service_role;

create or replace function private.messaging_can_manage(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.messaging_is_staff(p_tenant_id)
     and private.can_write_permission(p_tenant_id, 'communication_tools');
$$;
revoke all on function private.messaging_can_manage(text) from public, anon;
grant execute on function private.messaging_can_manage(text) to authenticated, service_role;

create or replace function private.messaging_can_mutate(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.messaging_actor_id(p_tenant_id) is not null
     and (not private.messaging_is_staff(p_tenant_id) or private.messaging_can_manage(p_tenant_id));
$$;
revoke all on function private.messaging_can_mutate(text) from public;
grant execute on function private.messaging_can_mutate(text) to anon, authenticated, service_role;

create or replace function private.messaging_is_participant(p_conversation_id text, p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_participants cp on cp.conversation_id = c.id
    where c.id = p_conversation_id
      and c.tenant_id = p_tenant_id
      and cp.user_id = private.messaging_actor_id(p_tenant_id)
  );
$$;
revoke all on function private.messaging_is_participant(text,text) from public;
grant execute on function private.messaging_is_participant(text,text) to anon, authenticated, service_role;

create or replace function private.messaging_can_view_conversation(p_conversation_id text, p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.messaging_is_participant(p_conversation_id, p_tenant_id);
$$;
revoke all on function private.messaging_can_view_conversation(text,text) from public;
grant execute on function private.messaging_can_view_conversation(text,text) to anon, authenticated, service_role;

create or replace function private.messaging_can_add_participant(p_conversation_id text, p_user_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant text;
  v_type text;
  v_created_by text;
  v_actor text;
  v_count integer;
begin
  select c.tenant_id, c.type, c.created_by
    into v_tenant, v_type, v_created_by
  from public.conversations c
  where c.id = p_conversation_id;

  if v_tenant is null then return false; end if;
  v_actor := private.messaging_actor_id(v_tenant);
  if v_actor is null then return false; end if;
  if not private.messaging_actor_belongs_to_tenant(p_user_id, v_tenant) then return false; end if;

  select count(*) into v_count
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id;

  if v_created_by = v_actor then
    if v_type = 'direct' then return v_count < 2; end if;
    return private.messaging_can_manage(v_tenant);
  end if;

  return private.messaging_is_participant(p_conversation_id, v_tenant)
     and private.messaging_can_manage(v_tenant);
end;
$$;
revoke all on function private.messaging_can_add_participant(text,text) from public;
grant execute on function private.messaging_can_add_participant(text,text) to anon, authenticated, service_role;

create or replace function private.messaging_conversation_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text;
begin
  v_actor := private.messaging_actor_id(new.tenant_id);
  if v_actor is not null and not coalesce(new.is_staff_directory,false) then
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    values(new.id,v_actor,0,now())
    on conflict (conversation_id,user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.messaging_conversation_after_insert() from public, anon, authenticated;
grant execute on function private.messaging_conversation_after_insert() to service_role;

drop trigger if exists messaging_conversation_after_insert on public.conversations;
create trigger messaging_conversation_after_insert
after insert on public.conversations
for each row execute function private.messaging_conversation_after_insert();

create or replace function private.guard_message_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text;
begin
  v_actor := private.messaging_actor_id(new.tenant_id);

  if v_actor is null
     and coalesce(current_setting('request.jwt.claims', true),'{}')::jsonb ->> 'role' = 'service_role' then
    v_actor := new.sender_id;
    if not private.messaging_actor_belongs_to_tenant(v_actor,new.tenant_id) then
      raise exception 'Service message sender is not a tenant actor.' using errcode='42501';
    end if;
  end if;

  if v_actor is null then
    raise exception 'Messaging identity is not authorized.' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id = v_actor
  ) then
    raise exception 'Messaging conversation access denied.' using errcode='42501';
  end if;

  if tg_op = 'INSERT' then
    new.sender_id := v_actor;
  elsif new.sender_id is distinct from old.sender_id
     or new.tenant_id is distinct from old.tenant_id
     or new.conversation_id is distinct from old.conversation_id then
    raise exception 'Message identity fields are immutable.' using errcode='42501';
  end if;

  if new.reply_to_id is not null and not exists (
    select 1 from public.messages parent
    where parent.id = new.reply_to_id
      and parent.tenant_id = new.tenant_id
      and parent.conversation_id = new.conversation_id
  ) then
    raise exception 'Reply target must be in the same conversation.' using errcode='23514';
  end if;

  if new.attachment_url is not null
     and left(new.attachment_url, length(new.tenant_id || '/' || new.conversation_id || '/' || v_actor || '/'))
         <> new.tenant_id || '/' || new.conversation_id || '/' || v_actor || '/' then
    raise exception 'Attachment path does not belong to the sender conversation.' using errcode='23514';
  end if;

  return new;
end;
$$;
revoke all on function private.guard_message_identity() from public, anon, authenticated;
grant execute on function private.guard_message_identity() to service_role;

drop trigger if exists guard_message_identity on public.messages;
create trigger guard_message_identity
before insert or update on public.messages
for each row execute function private.guard_message_identity();

create or replace function private.messaging_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations c
  set last_message_preview = left(new.body, 100),
      last_message_at = new.created_at,
      updated_at = coalesce(new.created_at, now()),
      status = 'open'
  where c.id = new.conversation_id
    and c.tenant_id = new.tenant_id;

  update public.conversation_participants cp
  set unread_count = coalesce(cp.unread_count,0) + 1
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;

  return new;
end;
$$;
revoke all on function private.messaging_message_after_insert() from public, anon, authenticated;
grant execute on function private.messaging_message_after_insert() to service_role;

drop trigger if exists messaging_message_after_insert on public.messages;
create trigger messaging_message_after_insert
after insert on public.messages
for each row execute function private.messaging_message_after_insert();

create or replace function private.mark_messaging_conversation_read(p_conversation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant text;
  v_actor text;
begin
  select c.tenant_id into v_tenant
  from public.conversations c
  where c.id = p_conversation_id;

  if v_tenant is null then
    raise exception 'Conversation not found.' using errcode='P0002';
  end if;

  v_actor := private.messaging_actor_id(v_tenant);
  if v_actor is null or not private.messaging_is_participant(p_conversation_id, v_tenant) then
    raise exception 'Messaging conversation access denied.' using errcode='42501';
  end if;

  update public.conversation_participants cp
  set unread_count = 0,
      last_read_at = now()
  where cp.conversation_id = p_conversation_id
    and cp.user_id = v_actor;

  update public.messages m
  set is_read = true,
      read_at = coalesce(m.read_at, now()),
      status = 'read'
  where m.conversation_id = p_conversation_id
    and m.tenant_id = v_tenant
    and m.sender_id <> v_actor
    and coalesce(m.is_read,false) = false;
end;
$$;
revoke all on function private.mark_messaging_conversation_read(text) from public;
grant execute on function private.mark_messaging_conversation_read(text) to anon, authenticated, service_role;

create or replace function public.mark_messaging_conversation_read(p_conversation_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.mark_messaging_conversation_read(p_conversation_id);
$$;
revoke all on function public.mark_messaging_conversation_read(text) from public;
grant execute on function public.mark_messaging_conversation_read(text) to anon, authenticated, service_role;

create or replace function public.batch_increment_unread_count(p_conversation_id text, p_excluding_user_id text)
returns void
language sql
security invoker
set search_path = ''
as $$ select null::void; $$;
revoke all on function public.batch_increment_unread_count(text,text) from public, anon, authenticated;

create or replace function public.increment_unread_count(p_conversation_id text, p_user_id text)
returns void
language sql
security invoker
set search_path = ''
as $$ select null::void; $$;
revoke all on function public.increment_unread_count(text,text) from public, anon, authenticated;

insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
select c.id,u.id,0,now()
from public.conversations c
join public.users u on u.tenant_id=c.tenant_id and u.status='active'
where coalesce(c.is_forum,false)
on conflict (conversation_id,user_id) do nothing;

insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
select c.id,m.id,0,now()
from public.conversations c
join public.members m on m.tenant_id=c.tenant_id
where coalesce(c.is_forum,false)
  and coalesce(m.status,'active') <> 'inactive'
  and coalesce(m.membership_status,'active') <> 'Pending Approval'
on conflict (conversation_id,user_id) do nothing;
