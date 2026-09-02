begin;

alter table public.groups add column if not exists cover_color varchar default '#4F46E5';
alter table public.house_fellowships add column if not exists cover_color varchar default '#4F46E5';
alter table public.follow_up_tasks add column if not exists related_convert_id varchar;

do $$
begin
  if to_regclass('public.new_converts') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = 'public.follow_up_tasks'::regclass
         and conname = 'follow_up_tasks_related_convert_id_fkey'
     ) then
    alter table public.follow_up_tasks
      add constraint follow_up_tasks_related_convert_id_fkey
      foreign key (related_convert_id) references public.new_converts(id)
      on delete set null;
  end if;
end $$;

alter table public.services add column if not exists is_published boolean not null default false;

alter table public.new_converts
  add column if not exists first_name varchar,
  add column if not exists last_name varchar,
  add column if not exists phone varchar,
  add column if not exists email varchar,
  add column if not exists conversion_date date,
  add column if not exists counsellor_name varchar,
  add column if not exists graduation_date date;

update public.new_converts set conversion_date = salvation_date where conversion_date is null and salvation_date is not null;
update public.new_converts set graduation_date = graduated_at::date where graduation_date is null and graduated_at is not null;

update public.new_converts nc
set first_name = coalesce(nc.first_name, m.first_name),
    last_name  = coalesce(nc.last_name, m.last_name),
    phone      = coalesce(nc.phone, m.phone),
    email      = coalesce(nc.email, m.email)
from public.members m
where nc.member_id = m.id;

update public.new_converts nc
set first_name = coalesce(nc.first_name, v.first_name),
    last_name  = coalesce(nc.last_name, v.last_name),
    phone      = coalesce(nc.phone, v.phone),
    email      = coalesce(nc.email, v.email)
from public.visitors v
where nc.visitor_id = v.id;

create index if not exists groups_tenant_active_idx on public.groups (tenant_id, is_active);
create index if not exists house_fellowships_tenant_active_idx on public.house_fellowships (tenant_id, is_active);
create index if not exists follow_up_tasks_tenant_related_convert_idx on public.follow_up_tasks (tenant_id, related_convert_id) where related_convert_id is not null;
create index if not exists services_tenant_date_published_idx on public.services (tenant_id, service_date, is_published);
create index if not exists new_converts_tenant_conversion_date_idx on public.new_converts (tenant_id, conversion_date desc);

create table if not exists public.service_attendance (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  service_id varchar not null references public.services(id) on delete cascade,
  member_id varchar references public.members(id) on delete set null,
  visitor_id varchar references public.visitors(id) on delete set null,
  attendee_name text,
  status varchar not null default 'present',
  check_in_method varchar not null default 'admin',
  checked_in_at timestamptz not null default now(),
  notes text,
  created_by varchar,
  created_at timestamptz not null default now(),
  constraint service_attendance_identity_check check (
    member_id is not null or visitor_id is not null or nullif(trim(attendee_name), '') is not null
  )
);

create unique index if not exists service_attendance_service_member_unique on public.service_attendance (service_id, member_id) where member_id is not null;
create unique index if not exists service_attendance_service_visitor_unique on public.service_attendance (service_id, visitor_id) where visitor_id is not null;
create index if not exists service_attendance_tenant_service_idx on public.service_attendance (tenant_id, service_id, checked_in_at desc);

alter table public.service_attendance enable row level security;

drop policy if exists service_attendance_staff_read on public.service_attendance;
create policy service_attendance_staff_read on public.service_attendance for select to authenticated using (private.actor_has_tenant(tenant_id));

drop policy if exists service_attendance_staff_write on public.service_attendance;
create policy service_attendance_staff_write on public.service_attendance for all to authenticated using (private.can_manage_people(tenant_id)) with check (private.can_manage_people(tenant_id));

analyze public.groups;
analyze public.house_fellowships;
analyze public.follow_up_tasks;
analyze public.services;
analyze public.new_converts;
analyze public.service_attendance;

commit;;
