begin;

create or replace function private.enforce_volunteer_role_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count bigint;
begin
  if NEW.role_id is null or coalesce(NEW.status, 'confirmed') <> 'confirmed' then
    return NEW;
  end if;

  select r.max_volunteers
    into v_max
  from public.volunteer_roles r
  where r.id = NEW.role_id
    and r.tenant_id = NEW.tenant_id
  for update;

  if not found or v_max is null or v_max <= 0 then
    return NEW;
  end if;

  select count(*)
    into v_count
  from public.volunteers v
  where v.role_id = NEW.role_id
    and v.tenant_id = NEW.tenant_id
    and coalesce(v.status, 'confirmed') = 'confirmed'
    and v.id <> coalesce(NEW.id, '');

  if v_count >= v_max then
    raise exception 'Volunteer role capacity reached.' using errcode = '23514';
  end if;

  return NEW;
end;
$$;

revoke all on function private.enforce_volunteer_role_capacity()
  from public, anon, authenticated;
grant execute on function private.enforce_volunteer_role_capacity()
  to service_role;

drop trigger if exists volunteer_role_capacity_guard on public.volunteers;
create trigger volunteer_role_capacity_guard
before insert or update of tenant_id, role_id, status
on public.volunteers
for each row execute function private.enforce_volunteer_role_capacity();

create or replace function private.refresh_volunteer_assignment_hours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    update public.volunteers
       set hours_served = coalesce(hours_served, 0) + NEW.hours
     where id = NEW.assignment_id
       and tenant_id = NEW.tenant_id;
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    update public.volunteers
       set hours_served = greatest(0, coalesce(hours_served, 0) - OLD.hours)
     where id = OLD.assignment_id
       and tenant_id = OLD.tenant_id;
    return OLD;
  end if;

  if NEW.assignment_id = OLD.assignment_id
     and NEW.tenant_id = OLD.tenant_id then
    update public.volunteers
       set hours_served = greatest(0, coalesce(hours_served, 0) + NEW.hours - OLD.hours)
     where id = NEW.assignment_id
       and tenant_id = NEW.tenant_id;
  else
    update public.volunteers
       set hours_served = greatest(0, coalesce(hours_served, 0) - OLD.hours)
     where id = OLD.assignment_id
       and tenant_id = OLD.tenant_id;

    update public.volunteers
       set hours_served = coalesce(hours_served, 0) + NEW.hours
     where id = NEW.assignment_id
       and tenant_id = NEW.tenant_id;
  end if;

  return NEW;
end;
$$;

revoke all on function private.refresh_volunteer_assignment_hours()
  from public, anon, authenticated;
grant execute on function private.refresh_volunteer_assignment_hours()
  to service_role;

drop trigger if exists volunteer_hours_assignment_refresh on public.volunteer_hours;
create trigger volunteer_hours_assignment_refresh
after insert or update of tenant_id, assignment_id, hours or delete
on public.volunteer_hours
for each row execute function private.refresh_volunteer_assignment_hours();

commit;
