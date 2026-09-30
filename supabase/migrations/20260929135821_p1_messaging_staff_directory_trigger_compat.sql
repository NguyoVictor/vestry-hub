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

  if new.type='direct'
     and not coalesce(new.is_staff_directory,false)
     and new.staff_user_id is not null
     and exists (
       select 1 from public.users u
       where u.id=new.staff_user_id
         and u.tenant_id=new.tenant_id
         and u.status='active'
         and length(trim(coalesce(u.role,'')))>0
         and lower(coalesce(u.role,'')) not in ('member','guest')
     ) then
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    values(new.id,new.staff_user_id,0,now())
    on conflict (conversation_id,user_id) do nothing;
  end if;

  if coalesce(new.is_forum,false) then
    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    select new.id,u.id,0,now()
    from public.users u
    where u.tenant_id=new.tenant_id
      and u.status='active'
    on conflict (conversation_id,user_id) do nothing;

    insert into public.conversation_participants(conversation_id,user_id,unread_count,joined_at)
    select new.id,m.id,0,now()
    from public.members m
    where m.tenant_id=new.tenant_id
      and coalesce(m.status,'active')<>'inactive'
      and coalesce(m.membership_status,'active')<>'Pending Approval'
    on conflict (conversation_id,user_id) do nothing;
  end if;

  return new;
end;
$$;