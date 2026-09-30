create or replace function private.can_read_facility_bookings(p_tenant_id text)
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

revoke all on function private.can_read_facility_bookings(text) from public, anon;
grant execute on function private.can_read_facility_bookings(text) to authenticated, service_role;

drop policy if exists facility_bookings_staff_read on public.facility_bookings;
create policy facility_bookings_staff_read
on public.facility_bookings
for select
to authenticated
using (private.can_read_facility_bookings(tenant_id));

drop policy if exists facility_booking_responses_staff_read on public.facility_booking_responses;
create policy facility_booking_responses_staff_read
on public.facility_booking_responses
for select
to authenticated
using (private.can_read_facility_bookings(tenant_id));
