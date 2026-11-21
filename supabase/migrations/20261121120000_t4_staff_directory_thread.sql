-- T4 — every active staff member gets a staff-directory thread, server-side.
-- Before: threads were created only by the `create-staff-thread` function,
-- which trusted userId/tenantId from the request body; its browser caller was
-- removed in Phase 1B (unsafe), so NO staff member got a thread (staging:
-- 0 of 13) and the member portal "Message a staff member" list was empty.
-- Now: an AFTER trigger on public.users creates the thread when a row becomes
-- an active staff member of a church (invitation accepted, role changed from
-- member, re-activated). It does NOT modify the guarded Auth trigger.
--  * Idempotent: at most one directory thread per (tenant, staff user).
--  * Never blocks the user write: any failure is downgraded to a WARNING.
--  * Client inserts of staff-directory threads stay forbidden: the conversation
--    guard only lets them through when this SECURITY DEFINER function has set a
--    transaction-local flag (PostgREST clients cannot call set_config).
--  * No welcome message row (the message guard requires a participant actor);
--    the greeting is the thread preview, exactly as the old function showed it.
-- Existing staff are NOT backfilled here (product decision: makes every staff
-- member visible to members) — see docs/recovery/gate-b/t4_staff_directory_backfill.sql.
-- Rollback: DROP TRIGGER users_staff_directory_thread ON public.users; restore
-- private.guard_conversation_identity from 20260929135342.

CREATE OR REPLACE FUNCTION private.guard_conversation_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor text; v_role text;
begin
  if tg_op='INSERT' and coalesce(new.is_staff_directory,false)
     and current_setting('vestry.staff_directory_provisioning', true) = 'on' then
    return new; -- written by private.ensure_staff_directory_thread only
  end if;
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
$function$;

CREATE OR REPLACE FUNCTION private.ensure_staff_directory_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_name text;
  v_conv text;
begin
  if new.tenant_id is null or new.status is distinct from 'active'
     or length(trim(coalesce(new.role,''))) = 0
     or lower(new.role) in ('member','guest') then
    return null;
  end if;
  if exists (select 1 from public.conversations c
              where c.tenant_id = new.tenant_id and c.staff_user_id = new.id
                and coalesce(c.is_staff_directory,false)) then
    return null;
  end if;
  begin
    v_name := coalesce(nullif(trim(coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,'')),''), 'Team member');
    perform set_config('vestry.staff_directory_provisioning', 'on', true);
    insert into public.conversations(tenant_id, type, is_staff_directory, staff_user_id, name, created_by, status,
                                     last_message_preview, last_message_at)
    values (new.tenant_id, 'direct', true, new.id, v_name, new.id, 'open',
            left('Hi! I''m ' || v_name || '. Feel free to reach out with any questions, prayer requests, or concerns.', 100), now())
    returning id into v_conv;
    perform set_config('vestry.staff_directory_provisioning', 'off', true);
    insert into public.conversation_participants(conversation_id, user_id, unread_count, joined_at)
    values (v_conv, new.id, 0, now())
    on conflict (conversation_id, user_id) do nothing;
  exception when others then
    perform set_config('vestry.staff_directory_provisioning', 'off', true);
    raise warning 'staff directory thread not created for a staff user (%): %', sqlstate, sqlerrm;
  end;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION private.ensure_staff_directory_thread() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS users_staff_directory_thread ON public.users;
CREATE TRIGGER users_staff_directory_thread
  AFTER INSERT OR UPDATE OF status, role, tenant_id ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.ensure_staff_directory_thread();
