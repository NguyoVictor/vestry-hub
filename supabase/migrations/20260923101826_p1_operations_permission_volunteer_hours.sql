begin;

-- P1 operations permission and volunteer-hours hardening
create or replace function private.can_manage_events(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_write_permission(p_tenant_id, 'event_management');
$$;
revoke all on function private.can_manage_events(text) from public, anon;
grant execute on function private.can_manage_events(text) to authenticated, service_role;

create unique index if not exists volunteers_id_tenant_unique on public.volunteers(id, tenant_id);
create table if not exists public.volunteer_hours (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  assignment_id varchar not null,
  volunteer_member_id varchar not null,
  role_id varchar not null,
  hours numeric(7,2) not null check (hours > 0 and hours <= 24),
  activity_description text,
  logged_date date not null default current_date,
  logged_by varchar references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (assignment_id,tenant_id) references public.volunteers(id,tenant_id) on delete cascade,
  foreign key (volunteer_member_id,tenant_id) references public.members(id,tenant_id) on delete cascade,
  foreign key (role_id,tenant_id) references public.volunteer_roles(id,tenant_id) on delete restrict
);
create index if not exists volunteer_hours_tenant_date_idx on public.volunteer_hours(tenant_id, logged_date desc);
create index if not exists volunteer_hours_assignment_idx on public.volunteer_hours(assignment_id, tenant_id);
create index if not exists volunteer_hours_member_idx on public.volunteer_hours(volunteer_member_id, tenant_id, logged_date desc);
alter table public.volunteer_hours enable row level security;
revoke all on table public.volunteer_hours from public, anon, authenticated;
grant select,insert,update,delete on table public.volunteer_hours to authenticated,service_role;
create policy "volunteer_hours_staff_read" on public.volunteer_hours for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "volunteer_hours_staff_manage" on public.volunteer_hours for all to authenticated using (private.can_manage_events(tenant_id)) with check (private.can_manage_events(tenant_id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'services','events','event_rsvps','volunteer_roles','volunteers',
    'member_requests','service_request_types','board_meetings','meeting_attendees',
    'meeting_minutes','meeting_action_items','facilities','facility_bookings',
    'facility_booking_responses','facility_types','facility_images'
  ] loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('drop policy if exists %I on public.%I', t || '_staff_manage', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.actor_has_tenant(tenant_id))', t || '_staff_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.can_manage_events(tenant_id))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.can_manage_events(tenant_id)) with check (private.can_manage_events(tenant_id))', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.can_manage_events(tenant_id))', t || '_staff_delete', t);
  end loop;
end $$;

drop policy if exists "service_attendance_staff_write" on public.service_attendance;
drop policy if exists "service_attendance_staff_insert" on public.service_attendance;
drop policy if exists "service_attendance_staff_update" on public.service_attendance;
drop policy if exists "service_attendance_staff_delete" on public.service_attendance;
create policy "service_attendance_staff_insert" on public.service_attendance for insert to authenticated with check (private.can_manage_events(tenant_id));
create policy "service_attendance_staff_update" on public.service_attendance for update to authenticated using (private.can_manage_events(tenant_id)) with check (private.can_manage_events(tenant_id));
create policy "service_attendance_staff_delete" on public.service_attendance for delete to authenticated using (private.can_manage_events(tenant_id));

commit;