begin;

alter table public.member_request_notes
  add column if not exists tenant_id varchar;

update public.member_request_notes n
set tenant_id = r.tenant_id
from public.member_requests r
where r.id = n.request_id
  and n.tenant_id is null;

alter table public.member_request_notes
  alter column tenant_id set not null;

create unique index if not exists member_requests_id_tenant_unique
  on public.member_requests(id, tenant_id);

create index if not exists member_request_notes_tenant_request_idx
  on public.member_request_notes(tenant_id, request_id, created_at desc);

alter table public.member_request_notes
  drop constraint if exists member_request_notes_request_tenant_fkey;

alter table public.member_request_notes
  add constraint member_request_notes_request_tenant_fkey
  foreign key (request_id, tenant_id)
  references public.member_requests(id, tenant_id)
  on delete cascade;

alter table public.member_request_notes enable row level security;

drop policy if exists "mrn_tenant_rls" on public.member_request_notes;
drop policy if exists member_request_notes_staff_read on public.member_request_notes;
drop policy if exists member_request_notes_staff_insert on public.member_request_notes;
drop policy if exists member_request_notes_staff_update on public.member_request_notes;
drop policy if exists member_request_notes_staff_delete on public.member_request_notes;

revoke all on table public.member_request_notes from public, anon, authenticated;
grant select, insert, update, delete on table public.member_request_notes
  to authenticated, service_role;

create policy member_request_notes_staff_read
on public.member_request_notes
for select to authenticated
using (private.actor_has_tenant(tenant_id));

create policy member_request_notes_staff_insert
on public.member_request_notes
for insert to authenticated
with check (private.can_manage_events(tenant_id));

create policy member_request_notes_staff_update
on public.member_request_notes
for update to authenticated
using (private.can_manage_events(tenant_id))
with check (private.can_manage_events(tenant_id));

create policy member_request_notes_staff_delete
on public.member_request_notes
for delete to authenticated
using (private.can_manage_events(tenant_id));

commit;
