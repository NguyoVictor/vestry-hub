begin;

create or replace function private.can_read_board_meetings(p_tenant_id text)
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
        and length(trim(coalesce(u.role, ''))) > 0
        and lower(coalesce(u.role, '')) not in ('member', 'guest')
    );
$$;

create or replace function private.can_manage_board_meetings(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_read_board_meetings(p_tenant_id)
     and private.can_manage_events(p_tenant_id);
$$;

revoke all on function private.can_read_board_meetings(text) from public, anon;
revoke all on function private.can_manage_board_meetings(text) from public, anon;
grant execute on function private.can_read_board_meetings(text) to authenticated, service_role;
grant execute on function private.can_manage_board_meetings(text) to authenticated, service_role;

create unique index if not exists board_meetings_id_tenant_unique
  on public.board_meetings(id, tenant_id);

create index if not exists meeting_attendees_meeting_tenant_idx
  on public.meeting_attendees(meeting_id, tenant_id);
create index if not exists meeting_action_items_meeting_tenant_idx
  on public.meeting_action_items(meeting_id, tenant_id);

alter table public.meeting_attendees
  drop constraint if exists meeting_attendees_meeting_tenant_fkey;
alter table public.meeting_attendees
  add constraint meeting_attendees_meeting_tenant_fkey
  foreign key (meeting_id, tenant_id)
  references public.board_meetings(id, tenant_id)
  on delete cascade;

alter table public.meeting_minutes
  drop constraint if exists meeting_minutes_meeting_tenant_fkey;
alter table public.meeting_minutes
  add constraint meeting_minutes_meeting_tenant_fkey
  foreign key (meeting_id, tenant_id)
  references public.board_meetings(id, tenant_id)
  on delete cascade;

alter table public.meeting_decisions
  drop constraint if exists meeting_decisions_meeting_tenant_fkey;
alter table public.meeting_decisions
  add constraint meeting_decisions_meeting_tenant_fkey
  foreign key (meeting_id, tenant_id)
  references public.board_meetings(id, tenant_id)
  on delete cascade;

alter table public.meeting_action_items
  drop constraint if exists meeting_action_items_meeting_tenant_fkey;
alter table public.meeting_action_items
  add constraint meeting_action_items_meeting_tenant_fkey
  foreign key (meeting_id, tenant_id)
  references public.board_meetings(id, tenant_id)
  on delete cascade;

revoke all on table public.board_meetings from anon;
revoke all on table public.meeting_attendees from anon;
revoke all on table public.meeting_minutes from anon;
revoke all on table public.meeting_decisions from anon;
revoke all on table public.meeting_action_items from anon;

revoke all on table public.board_meetings from authenticated;
revoke all on table public.meeting_attendees from authenticated;
revoke all on table public.meeting_minutes from authenticated;
revoke all on table public.meeting_decisions from authenticated;
revoke all on table public.meeting_action_items from authenticated;

grant select, insert, update, delete on table public.board_meetings to authenticated, service_role;
grant select, insert, update, delete on table public.meeting_attendees to authenticated, service_role;
grant select, insert, update, delete on table public.meeting_minutes to authenticated, service_role;
grant select, insert, update, delete on table public.meeting_decisions to authenticated, service_role;
grant select, insert, update, delete on table public.meeting_action_items to authenticated, service_role;

drop policy if exists board_meetings_staff_read on public.board_meetings;
drop policy if exists board_meetings_staff_insert on public.board_meetings;
drop policy if exists board_meetings_staff_update on public.board_meetings;
drop policy if exists board_meetings_staff_delete on public.board_meetings;
create policy board_meetings_staff_read on public.board_meetings
  for select to authenticated using (private.can_read_board_meetings(tenant_id));
create policy board_meetings_staff_insert on public.board_meetings
  for insert to authenticated with check (private.can_manage_board_meetings(tenant_id));
create policy board_meetings_staff_update on public.board_meetings
  for update to authenticated using (private.can_manage_board_meetings(tenant_id))
  with check (private.can_manage_board_meetings(tenant_id));
create policy board_meetings_staff_delete on public.board_meetings
  for delete to authenticated using (private.can_manage_board_meetings(tenant_id));

drop policy if exists meeting_attendees_staff_read on public.meeting_attendees;
drop policy if exists meeting_attendees_staff_insert on public.meeting_attendees;
drop policy if exists meeting_attendees_staff_update on public.meeting_attendees;
drop policy if exists meeting_attendees_staff_delete on public.meeting_attendees;
create policy meeting_attendees_staff_read on public.meeting_attendees
  for select to authenticated using (private.can_read_board_meetings(tenant_id));
create policy meeting_attendees_staff_insert on public.meeting_attendees
  for insert to authenticated with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_attendees_staff_update on public.meeting_attendees
  for update to authenticated using (private.can_manage_board_meetings(tenant_id))
  with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_attendees_staff_delete on public.meeting_attendees
  for delete to authenticated using (private.can_manage_board_meetings(tenant_id));

drop policy if exists meeting_minutes_staff_read on public.meeting_minutes;
drop policy if exists meeting_minutes_staff_insert on public.meeting_minutes;
drop policy if exists meeting_minutes_staff_update on public.meeting_minutes;
drop policy if exists meeting_minutes_staff_delete on public.meeting_minutes;
create policy meeting_minutes_staff_read on public.meeting_minutes
  for select to authenticated using (private.can_read_board_meetings(tenant_id));
create policy meeting_minutes_staff_insert on public.meeting_minutes
  for insert to authenticated with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_minutes_staff_update on public.meeting_minutes
  for update to authenticated using (private.can_manage_board_meetings(tenant_id))
  with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_minutes_staff_delete on public.meeting_minutes
  for delete to authenticated using (private.can_manage_board_meetings(tenant_id));

drop policy if exists meeting_decisions_staff_manage on public.meeting_decisions;
drop policy if exists meeting_decisions_staff_read on public.meeting_decisions;
drop policy if exists meeting_decisions_staff_insert on public.meeting_decisions;
drop policy if exists meeting_decisions_staff_update on public.meeting_decisions;
drop policy if exists meeting_decisions_staff_delete on public.meeting_decisions;
create policy meeting_decisions_staff_read on public.meeting_decisions
  for select to authenticated using (private.can_read_board_meetings(tenant_id));
create policy meeting_decisions_staff_insert on public.meeting_decisions
  for insert to authenticated with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_decisions_staff_update on public.meeting_decisions
  for update to authenticated using (private.can_manage_board_meetings(tenant_id))
  with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_decisions_staff_delete on public.meeting_decisions
  for delete to authenticated using (private.can_manage_board_meetings(tenant_id));

drop policy if exists meeting_action_items_staff_read on public.meeting_action_items;
drop policy if exists meeting_action_items_staff_insert on public.meeting_action_items;
drop policy if exists meeting_action_items_staff_update on public.meeting_action_items;
drop policy if exists meeting_action_items_staff_delete on public.meeting_action_items;
create policy meeting_action_items_staff_read on public.meeting_action_items
  for select to authenticated using (private.can_read_board_meetings(tenant_id));
create policy meeting_action_items_staff_insert on public.meeting_action_items
  for insert to authenticated with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_action_items_staff_update on public.meeting_action_items
  for update to authenticated using (private.can_manage_board_meetings(tenant_id))
  with check (private.can_manage_board_meetings(tenant_id));
create policy meeting_action_items_staff_delete on public.meeting_action_items
  for delete to authenticated using (private.can_manage_board_meetings(tenant_id));

commit;
