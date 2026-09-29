create unique index if not exists users_id_tenant_unique on public.users(id, tenant_id);
create unique index if not exists testimonies_id_tenant_unique on public.testimonies(id, tenant_id);

alter table public.appointments
  drop constraint if exists appointments_staff_tenant_fkey;
alter table public.appointments
  add constraint appointments_staff_tenant_fkey
  foreign key (assigned_staff_id, tenant_id)
  references public.users(id, tenant_id);

alter table public.testimonies
  drop constraint if exists testimonies_member_id_fkey;
alter table public.testimonies
  add constraint testimonies_member_id_fkey
  foreign key (member_id) references public.members(id) on delete set null;
alter table public.testimonies
  drop constraint if exists testimonies_member_tenant_fkey;
alter table public.testimonies
  add constraint testimonies_member_tenant_fkey
  foreign key (member_id, tenant_id) references public.members(id, tenant_id);

alter table public.testimonies
  drop constraint if exists testimonies_category_id_fkey;
alter table public.testimonies
  add constraint testimonies_category_id_fkey
  foreign key (category_id) references public.testimony_categories(id) on delete set null;
alter table public.testimonies
  drop constraint if exists testimonies_category_tenant_fkey;
alter table public.testimonies
  add constraint testimonies_category_tenant_fkey
  foreign key (category_id, tenant_id) references public.testimony_categories(id, tenant_id);

alter table public.testimonies
  drop constraint if exists testimonies_approved_by_tenant_fkey;
alter table public.testimonies
  add constraint testimonies_approved_by_tenant_fkey
  foreign key (approved_by, tenant_id) references public.users(id, tenant_id);
alter table public.testimonies
  drop constraint if exists testimonies_submitted_by_admin_tenant_fkey;
alter table public.testimonies
  add constraint testimonies_submitted_by_admin_tenant_fkey
  foreign key (submitted_by_admin_id, tenant_id) references public.users(id, tenant_id);
alter table public.testimonies
  drop constraint if exists testimonies_submitted_by_member_fkey;
alter table public.testimonies
  add constraint testimonies_submitted_by_member_fkey
  foreign key (submitted_by_member_id) references public.members(id) on delete set null;
alter table public.testimonies
  drop constraint if exists testimonies_submitted_by_member_tenant_fkey;
alter table public.testimonies
  add constraint testimonies_submitted_by_member_tenant_fkey
  foreign key (submitted_by_member_id, tenant_id) references public.members(id, tenant_id);

alter table public.testimony_reactions
  drop constraint if exists testimony_reactions_testimony_tenant_fkey;
alter table public.testimony_reactions
  add constraint testimony_reactions_testimony_tenant_fkey
  foreign key (testimony_id, tenant_id) references public.testimonies(id, tenant_id) on delete cascade;
alter table public.testimony_reactions
  drop constraint if exists testimony_reactions_member_tenant_fkey;
alter table public.testimony_reactions
  add constraint testimony_reactions_member_tenant_fkey
  foreign key (member_id, tenant_id) references public.members(id, tenant_id) on delete cascade;

create or replace function private.guard_appointment_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status = 'pending' and new.status not in ('confirmed','declined','rescheduled','cancelled') then
      raise exception 'Invalid appointment status transition.' using errcode='23514';
    elsif old.status = 'confirmed' and new.status not in ('rescheduled','cancelled','completed') then
      raise exception 'Invalid appointment status transition.' using errcode='23514';
    elsif old.status = 'rescheduled' and new.status not in ('confirmed','rescheduled','cancelled','completed') then
      raise exception 'Invalid appointment status transition.' using errcode='23514';
    elsif old.status in ('declined','cancelled','completed') then
      raise exception 'Appointment status is final.' using errcode='23514';
    end if;
  end if;

  if new.mode = 'online' and new.status in ('confirmed','rescheduled') then
    new.jitsi_room_name := 'vestryhub-apt-' || new.id;
  else
    new.jitsi_room_name := null;
  end if;

  return new;
end;
$$;
revoke all on function private.guard_appointment_lifecycle() from public, anon, authenticated;
grant execute on function private.guard_appointment_lifecycle() to service_role;

drop trigger if exists appointment_lifecycle_guard on public.appointments;
create trigger appointment_lifecycle_guard
before insert or update of status, mode, jitsi_room_name
on public.appointments
for each row execute function private.guard_appointment_lifecycle();

drop policy if exists appointment_types_staff_read on public.appointment_types;
create policy appointment_types_staff_read on public.appointment_types
for select to authenticated using (private.can_read_engagement_staff(tenant_id));

drop policy if exists appointments_staff_read on public.appointments;
drop policy if exists appointments_staff_insert on public.appointments;
drop policy if exists appointments_staff_update on public.appointments;
drop policy if exists appointments_staff_delete on public.appointments;
create policy appointments_staff_read on public.appointments
for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy appointments_staff_insert on public.appointments
for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy appointments_staff_update on public.appointments
for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
with check (private.can_manage_engagement_staff(tenant_id));
create policy appointments_staff_delete on public.appointments
for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists appointments_member_insert on public.appointments;
create policy appointments_member_insert on public.appointments
for insert to anon with check (
  member_id = private.member_session_member_id(tenant_id)
  and status = 'pending'
  and assigned_staff_id is null
  and location is null
  and physical_notes is null
  and admin_notes is null
  and jitsi_room_name is null
  and rescheduled_date is null
  and rescheduled_time is null
  and decline_reason is null
  and exists (
    select 1 from public.appointment_types t
    where t.id = appointment_type_id
      and t.tenant_id = appointments.tenant_id
      and t.is_active
  )
);

drop policy if exists testimony_categories_staff_read on public.testimony_categories;
create policy testimony_categories_staff_read on public.testimony_categories
for select to authenticated using (private.can_read_engagement_staff(tenant_id));

drop policy if exists testimonies_staff_read on public.testimonies;
drop policy if exists testimonies_staff_insert on public.testimonies;
drop policy if exists testimonies_staff_update on public.testimonies;
drop policy if exists testimonies_staff_delete on public.testimonies;
create policy testimonies_staff_read on public.testimonies
for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy testimonies_staff_insert on public.testimonies
for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy testimonies_staff_update on public.testimonies
for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
with check (private.can_manage_engagement_staff(tenant_id));
create policy testimonies_staff_delete on public.testimonies
for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists testimonies_member_insert on public.testimonies;
drop policy if exists testimonies_member_update on public.testimonies;
create policy testimonies_member_insert on public.testimonies
for insert to anon with check (
  member_id = private.member_session_member_id(tenant_id)
  and submitted_by_member_id = member_id
  and submitted_by_admin_id is null
  and status = 'pending'
  and coalesce(is_approved,false) = false
  and approved_by is null
  and is_featured = false
  and (
    category_id is null or exists (
      select 1 from public.testimony_categories c
      where c.id = category_id and c.tenant_id = testimonies.tenant_id and c.is_active
    )
  )
);
create policy testimonies_member_update on public.testimonies
for update to anon using (
  member_id = private.member_session_member_id(tenant_id)
  and status in ('pending','declined')
) with check (
  member_id = private.member_session_member_id(tenant_id)
  and submitted_by_member_id = member_id
  and submitted_by_admin_id is null
  and status = 'pending'
  and coalesce(is_approved,false) = false
  and approved_by is null
  and is_featured = false
  and (
    category_id is null or exists (
      select 1 from public.testimony_categories c
      where c.id = category_id and c.tenant_id = testimonies.tenant_id and c.is_active
    )
  )
);

drop policy if exists testimony_reactions_staff_read on public.testimony_reactions;
create policy testimony_reactions_staff_read on public.testimony_reactions
for select to authenticated using (private.can_read_engagement_staff(tenant_id));

revoke update, delete, truncate, references, trigger on table public.appointments from anon;
revoke insert, update, delete, truncate, references, trigger on table public.appointment_types from anon;
revoke insert, update, delete, truncate, references, trigger on table public.testimony_categories from anon;
revoke update, truncate, references, trigger on table public.testimony_reactions from anon;
