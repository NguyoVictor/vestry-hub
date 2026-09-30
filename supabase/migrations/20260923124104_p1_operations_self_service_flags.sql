begin;

drop policy if exists event_rsvps_member_insert on public.event_rsvps;
drop policy if exists event_rsvps_member_update on public.event_rsvps;
create policy event_rsvps_member_insert on public.event_rsvps
for insert to anon
with check (
  member_id=private.member_session_member_id(tenant_id)
  and status in ('confirmed','cancelled')
  and (
    status='cancelled'
    or exists (
      select 1 from public.events e
      where e.id=event_rsvps.event_id
        and e.tenant_id=event_rsvps.tenant_id
        and e.is_published=true
        and e.status in ('published','completed')
        and e.allow_rsvp=true
    )
  )
);
create policy event_rsvps_member_update on public.event_rsvps
for update to anon
using (member_id=private.member_session_member_id(tenant_id))
with check (
  member_id=private.member_session_member_id(tenant_id)
  and status in ('confirmed','cancelled')
  and (
    status='cancelled'
    or exists (
      select 1 from public.events e
      where e.id=event_rsvps.event_id
        and e.tenant_id=event_rsvps.tenant_id
        and e.is_published=true
        and e.status in ('published','completed')
        and e.allow_rsvp=true
    )
  )
);

drop policy if exists service_attendance_member_insert on public.service_attendance;
drop policy if exists service_attendance_member_update on public.service_attendance;
create policy service_attendance_member_insert on public.service_attendance
for insert to anon
with check (
  member_id=private.member_session_member_id(tenant_id)
  and status in ('attending','cancelled')
  and (
    status='cancelled'
    or exists (
      select 1 from public.services s
      where s.id=service_attendance.service_id
        and s.tenant_id=service_attendance.tenant_id
        and s.is_published=true
        and s.status='published'
        and s.allow_attendance=true
    )
  )
);
create policy service_attendance_member_update on public.service_attendance
for update to anon
using (member_id=private.member_session_member_id(tenant_id))
with check (
  member_id=private.member_session_member_id(tenant_id)
  and status in ('attending','cancelled')
  and (
    status='cancelled'
    or exists (
      select 1 from public.services s
      where s.id=service_attendance.service_id
        and s.tenant_id=service_attendance.tenant_id
        and s.is_published=true
        and s.status='published'
        and s.allow_attendance=true
    )
  )
);

commit;
