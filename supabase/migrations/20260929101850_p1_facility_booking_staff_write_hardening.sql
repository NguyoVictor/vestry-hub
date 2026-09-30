create or replace function private.can_manage_facility_bookings(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_read_facility_bookings(p_tenant_id)
     and private.can_manage_events(p_tenant_id);
$$;

revoke all on function private.can_manage_facility_bookings(text) from public, anon;
grant execute on function private.can_manage_facility_bookings(text) to authenticated, service_role;

drop policy if exists facilities_staff_insert on public.facilities;
drop policy if exists facilities_staff_update on public.facilities;
drop policy if exists facilities_staff_delete on public.facilities;
create policy facilities_staff_insert on public.facilities
  for insert to authenticated
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facilities_staff_update on public.facilities
  for update to authenticated
  using (private.can_manage_facility_bookings(tenant_id))
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facilities_staff_delete on public.facilities
  for delete to authenticated
  using (private.can_manage_facility_bookings(tenant_id));

drop policy if exists facility_types_staff_insert on public.facility_types;
drop policy if exists facility_types_staff_update on public.facility_types;
drop policy if exists facility_types_staff_delete on public.facility_types;
create policy facility_types_staff_insert on public.facility_types
  for insert to authenticated
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_types_staff_update on public.facility_types
  for update to authenticated
  using (private.can_manage_facility_bookings(tenant_id))
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_types_staff_delete on public.facility_types
  for delete to authenticated
  using (private.can_manage_facility_bookings(tenant_id));

drop policy if exists facility_images_staff_insert on public.facility_images;
drop policy if exists facility_images_staff_update on public.facility_images;
drop policy if exists facility_images_staff_delete on public.facility_images;
create policy facility_images_staff_insert on public.facility_images
  for insert to authenticated
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_images_staff_update on public.facility_images
  for update to authenticated
  using (private.can_manage_facility_bookings(tenant_id))
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_images_staff_delete on public.facility_images
  for delete to authenticated
  using (private.can_manage_facility_bookings(tenant_id));

drop policy if exists facility_bookings_staff_insert on public.facility_bookings;
drop policy if exists facility_bookings_staff_update on public.facility_bookings;
drop policy if exists facility_bookings_staff_delete on public.facility_bookings;
create policy facility_bookings_staff_insert on public.facility_bookings
  for insert to authenticated
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_bookings_staff_update on public.facility_bookings
  for update to authenticated
  using (private.can_manage_facility_bookings(tenant_id))
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_bookings_staff_delete on public.facility_bookings
  for delete to authenticated
  using (private.can_manage_facility_bookings(tenant_id));

drop policy if exists facility_booking_responses_staff_insert on public.facility_booking_responses;
drop policy if exists facility_booking_responses_staff_update on public.facility_booking_responses;
drop policy if exists facility_booking_responses_staff_delete on public.facility_booking_responses;
create policy facility_booking_responses_staff_insert on public.facility_booking_responses
  for insert to authenticated
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_booking_responses_staff_update on public.facility_booking_responses
  for update to authenticated
  using (private.can_manage_facility_bookings(tenant_id))
  with check (private.can_manage_facility_bookings(tenant_id));
create policy facility_booking_responses_staff_delete on public.facility_booking_responses
  for delete to authenticated
  using (private.can_manage_facility_bookings(tenant_id));
