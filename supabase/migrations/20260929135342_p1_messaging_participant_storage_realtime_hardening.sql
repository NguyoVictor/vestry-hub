create or replace function private.messaging_can_view_conversation_id(p_conversation_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id=p_conversation_id
      and private.messaging_can_view_conversation(c.id,c.tenant_id)
  );
$$;
revoke all on function private.messaging_can_view_conversation_id(text) from public;
grant execute on function private.messaging_can_view_conversation_id(text) to anon, authenticated, service_role;

create or replace function private.messaging_can_manage_conversation(p_conversation_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id=p_conversation_id
      and private.messaging_is_participant(c.id,c.tenant_id)
      and private.messaging_can_manage(c.tenant_id)
  );
$$;
revoke all on function private.messaging_can_manage_conversation(text) from public, anon;
grant execute on function private.messaging_can_manage_conversation(text) to authenticated, service_role;

create or replace function private.messaging_can_create_conversation(
  p_tenant_id text, p_type text, p_staff_user_id text,
  p_is_forum boolean, p_is_staff_directory boolean, p_created_by text
)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare v_actor text;
begin
  v_actor := private.messaging_actor_id(p_tenant_id);
  if v_actor is null or p_created_by is distinct from v_actor then return false; end if;
  if coalesce(p_is_staff_directory,false) then return false; end if;
  if private.messaging_is_staff(p_tenant_id) then
    return private.messaging_can_manage(p_tenant_id) and p_type in ('direct','group');
  end if;
  return p_type='direct'
    and not coalesce(p_is_forum,false)
    and p_staff_user_id is not null
    and exists (
      select 1 from public.users u
      where u.id=p_staff_user_id and u.tenant_id=p_tenant_id and u.status='active'
        and length(trim(coalesce(u.role,'')))>0
        and lower(coalesce(u.role,'')) not in ('member','guest')
    );
end;
$$;
revoke all on function private.messaging_can_create_conversation(text,text,text,boolean,boolean,text) from public;
grant execute on function private.messaging_can_create_conversation(text,text,text,boolean,boolean,text) to anon, authenticated, service_role;

create or replace function private.messaging_can_add_participant(p_conversation_id text, p_user_id text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  v_tenant text; v_type text; v_created_by text; v_staff_user_id text;
  v_is_forum boolean; v_is_staff_directory boolean; v_actor text; v_count integer;
begin
  select c.tenant_id,c.type,c.created_by,c.staff_user_id,
         coalesce(c.is_forum,false),coalesce(c.is_staff_directory,false)
  into v_tenant,v_type,v_created_by,v_staff_user_id,v_is_forum,v_is_staff_directory
  from public.conversations c where c.id=p_conversation_id;
  if v_tenant is null or v_is_staff_directory then return false; end if;
  v_actor := private.messaging_actor_id(v_tenant);
  if v_actor is null or not private.messaging_actor_belongs_to_tenant(p_user_id,v_tenant) then return false; end if;
  select count(*) into v_count from public.conversation_participants cp where cp.conversation_id=p_conversation_id;
  if v_is_forum then
    return private.messaging_is_participant(p_conversation_id,v_tenant)
       and private.messaging_can_manage(v_tenant);
  end if;
  if v_created_by=v_actor then
    if v_type='direct' then
      if private.messaging_is_staff(v_tenant) then
        return private.messaging_can_manage(v_tenant) and v_count < 2;
      end if;
      return p_user_id=v_staff_user_id
        and v_count < 2
        and exists (
          select 1 from public.users u
          where u.id=p_user_id and u.tenant_id=v_tenant and u.status='active'
            and length(trim(coalesce(u.role,'')))>0
            and lower(coalesce(u.role,'')) not in ('member','guest')
        );
    end if;
    return private.messaging_can_manage(v_tenant);
  end if;
  return private.messaging_is_participant(p_conversation_id,v_tenant)
     and private.messaging_can_manage(v_tenant);
end;
$$;
revoke all on function private.messaging_can_add_participant(text,text) from public;
grant execute on function private.messaging_can_add_participant(text,text) to anon, authenticated, service_role;

create or replace function private.guard_conversation_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_actor text; v_role text;
begin
  v_actor := private.messaging_actor_id(new.tenant_id);
  v_role := coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb ->> 'role';
  if tg_op='INSERT' then
    if v_actor is not null then
      new.created_by := v_actor;
      if coalesce(new.is_staff_directory,false) then
        raise exception 'Staff directory conversations are server-managed.' using errcode='42501';
      end if;
    elsif v_role <> 'service_role' then
      raise exception 'Messaging identity is not authorized.' using errcode='42501';
    end if;
    return new;
  end if;
  if new.tenant_id is distinct from old.tenant_id
     or new.created_by is distinct from old.created_by
     or new.type is distinct from old.type
     or new.is_forum is distinct from old.is_forum
     or new.is_staff_directory is distinct from old.is_staff_directory
     or new.staff_user_id is distinct from old.staff_user_id then
    raise exception 'Conversation identity fields are immutable.' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_conversation_identity() from public, anon, authenticated;
grant execute on function private.guard_conversation_identity() to service_role;
drop trigger if exists guard_conversation_identity on public.conversations;
create trigger guard_conversation_identity before insert or update on public.conversations
for each row execute function private.guard_conversation_identity();

create or replace function private.messaging_conversation_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_actor text;
begin
  v_actor := private.messaging_actor_id(new.tenant_id);
  if v_actor is not null and not coalesce(new.is_staff_directory,false) then
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    values(new.id,v_actor,0,now()) on conflict (conversation_id,user_id) do nothing;
  end if;
  if new.type='direct' and new.staff_user_id is not null and exists (
    select 1 from public.users u
    where u.id=new.staff_user_id and u.tenant_id=new.tenant_id and u.status='active'
      and length(trim(coalesce(u.role,'')))>0
      and lower(coalesce(u.role,'')) not in ('member','guest')
  ) then
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    values(new.id,new.staff_user_id,0,now()) on conflict (conversation_id,user_id) do nothing;
  end if;
  if coalesce(new.is_forum,false) then
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    select new.id,u.id,0,now() from public.users u
    where u.tenant_id=new.tenant_id and u.status='active'
    on conflict (conversation_id,user_id) do nothing;
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    select new.id,m.id,0,now() from public.members m
    where m.tenant_id=new.tenant_id
      and coalesce(m.status,'active')<>'inactive'
      and coalesce(m.membership_status,'active')<>'Pending Approval'
    on conflict (conversation_id,user_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function private.guard_message_reaction_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_actor text;
begin
  v_actor := private.messaging_actor_id(new.tenant_id);
  if v_actor is null
     or not private.messaging_can_mutate(new.tenant_id)
     or not private.messaging_is_participant(new.conversation_id,new.tenant_id) then
    raise exception 'Messaging reaction access denied.' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    new.user_id := v_actor;
  elsif new.user_id is distinct from old.user_id
     or new.tenant_id is distinct from old.tenant_id
     or new.conversation_id is distinct from old.conversation_id
     or new.message_id is distinct from old.message_id then
    raise exception 'Message reaction identity fields are immutable.' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_message_reaction_identity() from public, anon, authenticated;
grant execute on function private.guard_message_reaction_identity() to service_role;
drop trigger if exists guard_message_reaction_identity on public.message_reactions;
create trigger guard_message_reaction_identity before insert or update on public.message_reactions
for each row execute function private.guard_message_reaction_identity();

drop policy if exists conversations_tenant_rls on public.conversations;
drop policy if exists member_tenant_isolation on public.conversations;
drop policy if exists tenant_isolation on public.conversations;
drop policy if exists conversations_public_read on public.conversations;
drop policy if exists conversations_public_update on public.conversations;
drop policy if exists conversations_participant_read on public.conversations;
drop policy if exists conversations_actor_insert on public.conversations;
drop policy if exists conversations_staff_update on public.conversations;
drop policy if exists conversations_staff_delete on public.conversations;
create policy conversations_participant_read on public.conversations
for select to anon,authenticated using (private.messaging_can_view_conversation(id,tenant_id));
create policy conversations_actor_insert on public.conversations
for insert to anon,authenticated with check (
  private.messaging_can_create_conversation(
    tenant_id,type,staff_user_id,coalesce(is_forum,false),
    coalesce(is_staff_directory,false),created_by
  )
);
create policy conversations_staff_update on public.conversations
for update to authenticated
using (private.messaging_is_participant(id,tenant_id) and private.messaging_can_manage(tenant_id))
with check (private.messaging_is_participant(id,tenant_id) and private.messaging_can_manage(tenant_id));
create policy conversations_staff_delete on public.conversations
for delete to authenticated
using (private.messaging_is_participant(id,tenant_id) and private.messaging_can_manage(tenant_id));

drop policy if exists conv_participants_rls on public.conversation_participants;
drop policy if exists member_conv_participants_rls on public.conversation_participants;
drop policy if exists tenant_isolation on public.conversation_participants;
drop policy if exists conv_participants_public_read on public.conversation_participants;
drop policy if exists conv_participants_public_update on public.conversation_participants;
drop policy if exists conversation_participants_participant_read on public.conversation_participants;
drop policy if exists conversation_participants_actor_insert on public.conversation_participants;
drop policy if exists conversation_participants_staff_delete on public.conversation_participants;
create policy conversation_participants_participant_read on public.conversation_participants
for select to anon,authenticated using (private.messaging_can_view_conversation_id(conversation_id));
create policy conversation_participants_actor_insert on public.conversation_participants
for insert to anon,authenticated with check (
  coalesce(unread_count,0)=0 and last_read_at is null
  and private.messaging_can_add_participant(conversation_id,user_id)
);
create policy conversation_participants_staff_delete on public.conversation_participants
for delete to authenticated using (private.messaging_can_manage_conversation(conversation_id));

drop policy if exists messages_tenant_rls on public.messages;
drop policy if exists member_messages_rls on public.messages;
drop policy if exists messages_public_read on public.messages;
drop policy if exists messages_public_insert on public.messages;
drop policy if exists messages_public_delete on public.messages;
drop policy if exists messages_participant_read on public.messages;
drop policy if exists messages_participant_insert on public.messages;
drop policy if exists messages_sender_update on public.messages;
drop policy if exists messages_sender_delete on public.messages;
create policy messages_participant_read on public.messages
for select to anon,authenticated using (private.messaging_is_participant(conversation_id,tenant_id));
create policy messages_participant_insert on public.messages
for insert to anon,authenticated with check (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and sender_id=private.messaging_actor_id(tenant_id)
);
create policy messages_sender_update on public.messages
for update to anon,authenticated
using (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and sender_id=private.messaging_actor_id(tenant_id)
)
with check (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and sender_id=private.messaging_actor_id(tenant_id)
);
create policy messages_sender_delete on public.messages
for delete to anon,authenticated using (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and sender_id=private.messaging_actor_id(tenant_id)
);

drop policy if exists reactions_member_auth_read on public.message_reactions;
drop policy if exists reactions_member_auth_insert on public.message_reactions;
drop policy if exists reactions_member_auth_update on public.message_reactions;
drop policy if exists reactions_member_auth_delete on public.message_reactions;
drop policy if exists message_reactions_participant_read on public.message_reactions;
drop policy if exists message_reactions_participant_insert on public.message_reactions;
drop policy if exists message_reactions_actor_update on public.message_reactions;
drop policy if exists message_reactions_actor_delete on public.message_reactions;
create policy message_reactions_participant_read on public.message_reactions
for select to anon,authenticated using (private.messaging_is_participant(conversation_id,tenant_id));
create policy message_reactions_participant_insert on public.message_reactions
for insert to anon,authenticated with check (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and user_id=private.messaging_actor_id(tenant_id)
);
create policy message_reactions_actor_update on public.message_reactions
for update to anon,authenticated
using (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and user_id=private.messaging_actor_id(tenant_id)
)
with check (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and user_id=private.messaging_actor_id(tenant_id)
);
create policy message_reactions_actor_delete on public.message_reactions
for delete to anon,authenticated using (
  private.messaging_is_participant(conversation_id,tenant_id)
  and private.messaging_can_mutate(tenant_id)
  and user_id=private.messaging_actor_id(tenant_id)
);

create or replace function private.mark_messaging_conversation_unread(p_conversation_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_tenant text; v_actor text;
begin
  select c.tenant_id into v_tenant from public.conversations c where c.id=p_conversation_id;
  if v_tenant is null then raise exception 'Conversation not found.' using errcode='P0002'; end if;
  v_actor := private.messaging_actor_id(v_tenant);
  if v_actor is null or not private.messaging_is_participant(p_conversation_id,v_tenant) then
    raise exception 'Messaging conversation access denied.' using errcode='42501';
  end if;
  update public.conversation_participants cp
  set unread_count=greatest(coalesce(cp.unread_count,0),1)
  where cp.conversation_id=p_conversation_id and cp.user_id=v_actor;
end;
$$;
revoke all on function private.mark_messaging_conversation_unread(text) from public;
grant execute on function private.mark_messaging_conversation_unread(text) to anon,authenticated,service_role;
create or replace function public.mark_messaging_conversation_unread(p_conversation_id text)
returns void language sql security invoker set search_path = ''
as $$ select private.mark_messaging_conversation_unread(p_conversation_id); $$;
revoke all on function public.mark_messaging_conversation_unread(text) from public;
grant execute on function public.mark_messaging_conversation_unread(text) to anon,authenticated,service_role;

create or replace function private.get_messaging_staff_directory(p_tenant_id text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_actor text; v_result jsonb;
begin
  v_actor := private.messaging_actor_id(p_tenant_id);
  if v_actor is null then raise exception 'Messaging identity is not authorized.' using errcode='42501'; end if;
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',c.id,'tenant_id',c.tenant_id,'type',c.type,'name',c.name,
        'description',c.description,'status',c.status,'is_forum',coalesce(c.is_forum,false),
        'is_staff_directory',coalesce(c.is_staff_directory,false),'staff_user_id',c.staff_user_id,
        'staff_user',jsonb_build_object(
          'id',u.id,'first_name',u.first_name,'last_name',u.last_name,'role',u.role,'status',u.status
        )
      )
      order by lower(coalesce(u.first_name,'')),lower(coalesce(u.last_name,''))
    ),'[]'::jsonb
  ) into v_result
  from public.conversations c
  join public.users u on u.id=c.staff_user_id and u.tenant_id=c.tenant_id
  where c.tenant_id=p_tenant_id
    and coalesce(c.is_staff_directory,false)
    and u.status='active'
    and length(trim(coalesce(u.role,'')))>0
    and lower(coalesce(u.role,'')) not in ('member','guest');
  return v_result;
end;
$$;
revoke all on function private.get_messaging_staff_directory(text) from public;
grant execute on function private.get_messaging_staff_directory(text) to anon,authenticated,service_role;
create or replace function public.get_messaging_staff_directory(p_tenant_id text)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.get_messaging_staff_directory(p_tenant_id); $$;
revoke all on function public.get_messaging_staff_directory(text) from public;
grant execute on function public.get_messaging_staff_directory(text) to anon,authenticated,service_role;

create or replace function private.get_messaging_actor_directory(p_tenant_id text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_actor text; v_result jsonb;
begin
  v_actor := private.messaging_actor_id(p_tenant_id);
  if v_actor is null then raise exception 'Messaging identity is not authorized.' using errcode='42501'; end if;
  with visible_actor_ids as (
    select distinct cp.user_id
    from public.conversation_participants cp
    join public.conversations c on c.id=cp.conversation_id
    where c.tenant_id=p_tenant_id
      and private.messaging_is_participant(c.id,c.tenant_id)
  ),
  actors as (
    select u.id,nullif(trim(concat_ws(' ',u.first_name,u.last_name)),'') as display_name,
           'staff'::text as actor_type,u.role
    from public.users u join visible_actor_ids v on v.user_id=u.id
    where u.tenant_id=p_tenant_id and u.status='active'
    union all
    select m.id,nullif(trim(concat_ws(' ',m.first_name,m.last_name)),'') as display_name,
           'member'::text as actor_type,null::text as role
    from public.members m join visible_actor_ids v on v.user_id=m.id
    where m.tenant_id=p_tenant_id
      and coalesce(m.status,'active')<>'inactive'
      and coalesce(m.membership_status,'active')<>'Pending Approval'
      and not exists (
        select 1 from public.users u
        where u.id=m.id and u.tenant_id=p_tenant_id and u.status='active'
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',id,'display_name',coalesce(display_name,'Team member'),
        'actor_type',actor_type,'role',role
      )
      order by lower(coalesce(display_name,''))
    ),'[]'::jsonb
  ) into v_result from actors;
  return v_result;
end;
$$;
revoke all on function private.get_messaging_actor_directory(text) from public;
grant execute on function private.get_messaging_actor_directory(text) to anon,authenticated,service_role;
create or replace function public.get_messaging_actor_directory(p_tenant_id text)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.get_messaging_actor_directory(p_tenant_id); $$;
revoke all on function public.get_messaging_actor_directory(text) from public;
grant execute on function public.get_messaging_actor_directory(text) to anon,authenticated,service_role;

drop policy if exists "msg_attachments_insert" on storage.objects;
drop policy if exists "msg_attachments_insert_anon" on storage.objects;
drop policy if exists "msg_attachments_read" on storage.objects;
drop policy if exists "msg_attachments_read_anon" on storage.objects;
drop policy if exists message_attachments_participant_read on storage.objects;
drop policy if exists message_attachments_actor_insert on storage.objects;
drop policy if exists message_attachments_actor_delete on storage.objects;
create policy message_attachments_participant_read on storage.objects
for select to anon,authenticated using (
  bucket_id='message-attachments'
  and coalesce(array_length(storage.foldername(name),1),0)>=3
  and private.messaging_is_participant((storage.foldername(name))[2],(storage.foldername(name))[1])
);
create policy message_attachments_actor_insert on storage.objects
for insert to anon,authenticated with check (
  bucket_id='message-attachments'
  and coalesce(array_length(storage.foldername(name),1),0)>=3
  and (storage.foldername(name))[3]=private.messaging_actor_id((storage.foldername(name))[1])
  and private.messaging_is_participant((storage.foldername(name))[2],(storage.foldername(name))[1])
  and private.messaging_can_mutate((storage.foldername(name))[1])
);
create policy message_attachments_actor_delete on storage.objects
for delete to anon,authenticated using (
  bucket_id='message-attachments'
  and coalesce(array_length(storage.foldername(name),1),0)>=3
  and (storage.foldername(name))[3]=private.messaging_actor_id((storage.foldername(name))[1])
  and private.messaging_is_participant((storage.foldername(name))[2],(storage.foldername(name))[1])
  and private.messaging_can_mutate((storage.foldername(name))[1])
);

alter table public.messages replica identity full;
alter table public.message_reactions replica identity full;
alter table public.conversation_participants replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='messages'
  ) then alter publication supabase_realtime add table public.messages; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='message_reactions'
  ) then alter publication supabase_realtime add table public.message_reactions; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='conversation_participants'
  ) then alter publication supabase_realtime add table public.conversation_participants; end if;
end;
$$;