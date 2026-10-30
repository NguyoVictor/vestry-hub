drop policy if exists member_requests_staff_read on public.member_requests;
create policy member_requests_staff_read on public.member_requests
for select to authenticated
using (
 private.actor_has_tenant(tenant_id)
 and (
  coalesce(is_confidential,false)=false
  or private.can_manage_events(tenant_id::text)
 )
);
drop policy if exists member_request_notes_staff_read on public.member_request_notes;
create policy member_request_notes_staff_read on public.member_request_notes
for select to authenticated
using (
 private.actor_has_tenant(tenant_id)
 and exists (
  select 1 from public.member_requests mr
  where mr.id=request_id and mr.tenant_id=member_request_notes.tenant_id
  and (coalesce(mr.is_confidential,false)=false or private.can_manage_events(mr.tenant_id::text))
 )
);
