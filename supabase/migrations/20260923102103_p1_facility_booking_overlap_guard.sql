begin;
create or replace function private.guard_facility_booking_overlap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.status = 'cancelled'::public.task_status_enum
     or NEW.facility_id is null or NEW.start_time is null or NEW.end_time is null then
    return NEW;
  end if;
  if NEW.end_time <= NEW.start_time then
    raise exception 'facility_booking_invalid_time_range' using errcode = '22007';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.tenant_id || '|' || NEW.facility_id || '|' || NEW.booking_date::text, 0)
  );
  if exists (
    select 1 from public.facility_bookings b
    where b.tenant_id = NEW.tenant_id
      and b.facility_id = NEW.facility_id
      and b.booking_date = NEW.booking_date
      and b.id <> NEW.id
      and b.status <> 'cancelled'::public.task_status_enum
      and b.start_time is not null and b.end_time is not null
      and NEW.start_time < b.end_time and NEW.end_time > b.start_time
  ) then
    raise exception 'facility_booking_conflict' using errcode = '23P01';
  end if;
  return NEW;
end; $$;
revoke all on function private.guard_facility_booking_overlap() from public, anon, authenticated;
grant execute on function private.guard_facility_booking_overlap() to service_role;
drop trigger if exists facility_booking_overlap_guard on public.facility_bookings;
create trigger facility_booking_overlap_guard
before insert or update of tenant_id, facility_id, booking_date, start_time, end_time, status
on public.facility_bookings
for each row execute function private.guard_facility_booking_overlap();
commit;