create unique index if not exists facility_bookings_id_tenant_unique
  on public.facility_bookings(id, tenant_id);

alter table public.facility_images
  drop constraint if exists facility_images_facility_tenant_fkey;
alter table public.facility_images
  add constraint facility_images_facility_tenant_fkey
  foreign key (facility_id, tenant_id)
  references public.facilities(id, tenant_id)
  on delete cascade;

alter table public.facility_booking_responses
  drop constraint if exists facility_booking_responses_booking_tenant_fkey;
alter table public.facility_booking_responses
  add constraint facility_booking_responses_booking_tenant_fkey
  foreign key (booking_id, tenant_id)
  references public.facility_bookings(id, tenant_id)
  on delete cascade;

drop policy if exists facility_bookings_public_insert on public.facility_bookings;
create policy facility_bookings_public_insert
on public.facility_bookings
for insert
to anon
with check (
  source = 'external'
  and booked_by is null
  and status::text = 'open'
  and booker_type in ('external_individual', 'external_org')
  and approved_by is null
  and approved_at is null
  and confirmed_by is null
  and confirmed_at is null
  and admin_deleted_at is null
  and exists (
    select 1
    from public.facilities f
    where f.id = facility_bookings.facility_id
      and f.tenant_id = facility_bookings.tenant_id
      and f.is_active = true
  )
);

drop policy if exists facility_bookings_member_insert on public.facility_bookings;
create policy facility_bookings_member_insert
on public.facility_bookings
for insert
to anon
with check (
  source = 'member'
  and booker_type = 'member'
  and status::text = 'open'
  and booked_by = private.member_session_member_id(tenant_id)
  and approved_by is null
  and approved_at is null
  and confirmed_by is null
  and confirmed_at is null
  and admin_deleted_at is null
  and exists (
    select 1
    from public.facilities f
    where f.id = facility_bookings.facility_id
      and f.tenant_id = facility_bookings.tenant_id
      and f.is_active = true
  )
);

revoke delete on table public.facility_bookings from anon;
