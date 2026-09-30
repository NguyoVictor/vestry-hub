-- P1 OPERATIONS RECONCILIATION

-- Reconcile schema objects that are present in source/migration history but absent live.
alter table public.services add column if not exists status varchar not null default 'draft';
update public.services set status=case when is_published then 'published' else 'draft' end where status='draft' and is_published=true;

alter table public.volunteer_roles add column if not exists confirmed_count integer not null default 0;
update public.volunteer_roles r
set confirmed_count=(select count(*) from public.volunteers v where v.role_id=r.id and v.tenant_id=r.tenant_id and v.status='confirmed');

alter table public.facilities
  add column if not exists quotation numeric,
  add column if not exists thumbnail_path text,
  add column if not exists video_path text;

alter table public.facility_bookings
  add column if not exists booker_type varchar,
  add column if not exists booker_name varchar,
  add column if not exists booker_org_name varchar,
  add column if not exists booker_contact_person varchar,
  add column if not exists booker_phone varchar,
  add column if not exists booker_email varchar,
  add column if not exists booking_number varchar,
  add column if not exists source varchar not null default 'admin',
  add column if not exists external_name varchar,
  add column if not exists external_email varchar,
  add column if not exists external_phone varchar,
  add column if not exists external_org varchar,
  add column if not exists cancelled_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by varchar,
  add column if not exists admin_deleted_at timestamptz;

alter table public.meeting_action_items add column if not exists tenant_id varchar;
alter table public.meeting_action_items add column if not exists task_description text;
update public.meeting_action_items mai
set tenant_id=bm.tenant_id, task_description=coalesce(mai.task_description,mai.description)
from public.board_meetings bm
where bm.id=mai.meeting_id and (mai.tenant_id is null or mai.task_description is null);
alter table public.meeting_action_items alter column tenant_id set not null;

alter table public.meeting_attendees add column if not exists tenant_id varchar;
alter table public.meeting_attendees add column if not exists is_present boolean not null default true;
update public.meeting_attendees ma
set tenant_id=bm.tenant_id
from public.board_meetings bm
where bm.id=ma.meeting_id and ma.tenant_id is null;
alter table public.meeting_attendees alter column tenant_id set not null;

create table if not exists public.service_request_types (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  label text not null,
  internal_name text not null,
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,internal_name)
);

insert into public.service_request_types(tenant_id,label,internal_name,description,is_active,is_default,sort_order)
select t.id,v.label,v.internal_name,v.description,true,true,v.sort_order
from public.tenants t
cross join (values
 ('Prayer','prayer','Prayer support request',10),
 ('Counselling','counselling','Pastoral counselling session',20),
 ('Visitation','visitation','Home or hospital visitation request',30),
 ('Financial Aid','financial_aid','Request for financial assistance',40),
 ('Medical Support','medical_support','Request for medical support or assistance',50),
 ('Bereavement','bereavement','Bereavement support and care',60),
 ('General','general','General service request',70)
) as v(label,internal_name,description,sort_order)
on conflict(tenant_id,internal_name) do nothing;

create table if not exists public.meeting_minutes (
  id varchar primary key default gen_random_uuid()::text,
  meeting_id varchar not null references public.board_meetings(id) on delete cascade,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  minutes_text text not null default '',
  created_by varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(meeting_id)
);

create table if not exists public.meeting_decisions (
  id varchar primary key default gen_random_uuid()::text,
  meeting_id varchar not null references public.board_meetings(id) on delete cascade,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  decision_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facility_types (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  label varchar not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facility_images (
  id varchar primary key default gen_random_uuid()::text,
  facility_id varchar not null references public.facilities(id) on delete cascade,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  image_path varchar not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.facility_responses (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  facility_id varchar references public.facilities(id) on delete set null,
  respondent_name varchar not null,
  respondent_email varchar,
  respondent_phone varchar,
  respondent_org varchar,
  message text not null,
  source varchar not null default 'external' check(source in ('in_app','external','email','sms','whatsapp')),
  status varchar not null default 'new' check(status in ('new','read','converted')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facility_booking_responses (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  booking_id varchar not null references public.facility_bookings(id) on delete cascade,
  member_id varchar,
  facility_name varchar,
  message text,
  status varchar check(status in ('accepted','rejected')),
  channel varchar not null default 'in_app' check(channel in ('in_app','email','sms')),
  from_address varchar,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tenant-consistent foreign keys for self-service objects.
create unique index if not exists events_id_tenant_unique on public.events(id,tenant_id);
create unique index if not exists services_id_tenant_unique on public.services(id,tenant_id);
create unique index if not exists volunteer_roles_id_tenant_unique on public.volunteer_roles(id,tenant_id);
create unique index if not exists facilities_id_tenant_unique on public.facilities(id,tenant_id);

do $$
begin
  if not exists(select 1 from pg_constraint where conname='event_rsvps_event_tenant_fkey' and conrelid='public.event_rsvps'::regclass) then
    alter table public.event_rsvps add constraint event_rsvps_event_tenant_fkey foreign key(event_id,tenant_id) references public.events(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='event_rsvps_member_tenant_fkey' and conrelid='public.event_rsvps'::regclass) then
    alter table public.event_rsvps add constraint event_rsvps_member_tenant_fkey foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='service_attendance_service_tenant_fkey' and conrelid='public.service_attendance'::regclass) then
    alter table public.service_attendance add constraint service_attendance_service_tenant_fkey foreign key(service_id,tenant_id) references public.services(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='service_attendance_member_tenant_fkey' and conrelid='public.service_attendance'::regclass) then
    alter table public.service_attendance add constraint service_attendance_member_tenant_fkey foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='volunteers_role_tenant_fkey' and conrelid='public.volunteers'::regclass) then
    alter table public.volunteers add constraint volunteers_role_tenant_fkey foreign key(role_id,tenant_id) references public.volunteer_roles(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='volunteers_member_tenant_fkey' and conrelid='public.volunteers'::regclass) then
    alter table public.volunteers add constraint volunteers_member_tenant_fkey foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='member_requests_member_tenant_fkey' and conrelid='public.member_requests'::regclass) then
    alter table public.member_requests add constraint member_requests_member_tenant_fkey foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='facility_bookings_facility_tenant_fkey' and conrelid='public.facility_bookings'::regclass) then
    alter table public.facility_bookings add constraint facility_bookings_facility_tenant_fkey foreign key(facility_id,tenant_id) references public.facilities(id,tenant_id) on delete restrict;
  end if;
end $$;

create unique index if not exists event_rsvps_member_unique on public.event_rsvps(event_id,member_id) where member_id is not null;
create unique index if not exists volunteers_role_member_unique on public.volunteers(role_id,member_id) where member_id is not null;
create unique index if not exists service_attendance_service_member_unique on public.service_attendance(service_id,member_id) where member_id is not null;

-- Capacity and counter integrity.
create or replace function private.enforce_event_rsvp_capacity()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_capacity integer; v_count integer;
begin
  if new.member_id is null or new.status<>'confirmed' then return new; end if;
  select capacity_limit into v_capacity from public.events where id=new.event_id and tenant_id=new.tenant_id for update;
  if v_capacity is null then return new; end if;
  select count(*) into v_count from public.event_rsvps where event_id=new.event_id and status='confirmed' and id<>coalesce(new.id,'');
  if v_count>=v_capacity then raise exception 'Event capacity reached.' using errcode='23514'; end if;
  return new;
end $$;
drop trigger if exists event_rsvp_capacity_guard on public.event_rsvps;
create trigger event_rsvp_capacity_guard before insert or update of status,event_id on public.event_rsvps for each row execute function private.enforce_event_rsvp_capacity();

create or replace function private.refresh_volunteer_role_count()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.role_id is not null then
    update public.volunteer_roles r set confirmed_count=(select count(*) from public.volunteers v where v.role_id=old.role_id and v.tenant_id=old.tenant_id and v.status='confirmed') where r.id=old.role_id and r.tenant_id=old.tenant_id;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.role_id is not null then
    update public.volunteer_roles r set confirmed_count=(select count(*) from public.volunteers v where v.role_id=new.role_id and v.tenant_id=new.tenant_id and v.status='confirmed') where r.id=new.role_id and r.tenant_id=new.tenant_id;
  end if;
  return coalesce(new,old);
end $$;
drop trigger if exists volunteer_role_count_refresh on public.volunteers;
create trigger volunteer_role_count_refresh after insert or update or delete on public.volunteers for each row execute function private.refresh_volunteer_role_count();

create or replace function private.prevent_facility_booking_overlap()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if new.facility_id is null or new.status not in ('open','in_progress') then return new; end if;
  if exists(
    select 1 from public.facility_bookings b
    where b.tenant_id=new.tenant_id and b.facility_id=new.facility_id and b.booking_date=new.booking_date
      and b.id<>coalesce(new.id,'') and b.status in ('open','in_progress')
      and new.start_time < b.end_time and new.end_time > b.start_time
      and b.admin_deleted_at is null
  ) then raise exception 'Facility is already booked for the selected time.' using errcode='23P01'; end if;
  return new;
end $$;
drop trigger if exists facility_booking_overlap_guard on public.facility_bookings;
create trigger facility_booking_overlap_guard before insert or update of facility_id,booking_date,start_time,end_time,status on public.facility_bookings for each row execute function private.prevent_facility_booking_overlap();

create sequence if not exists public.facility_booking_number_seq start 1;
create or replace function private.set_facility_booking_number()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if new.booking_number is null then new.booking_number='BK-'||lpad(nextval('public.facility_booking_number_seq')::text,6,'0'); end if;
  return new;
end $$;
drop trigger if exists facility_booking_number_guard on public.facility_bookings;
create trigger facility_booking_number_guard before insert on public.facility_bookings for each row execute function private.set_facility_booking_number();

-- Member self-service field protection.
create or replace function private.protect_member_request_fields()
returns trigger language plpgsql security invoker set search_path=public,private,pg_temp as $$
declare v_member varchar;
begin
  if auth.uid() is not null then return new; end if;
  v_member=private.member_session_member_id(old.tenant_id);
  if v_member is null or old.member_id<>v_member or old.status::text<>'open' then raise exception 'Request cannot be changed.' using errcode='42501'; end if;
  if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or new.member_id is distinct from old.member_id
     or new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to
     or new.resolved_at is distinct from old.resolved_at or new.resolution_notes is distinct from old.resolution_notes
     or new.resolved_by is distinct from old.resolved_by or new.created_at is distinct from old.created_at then
    raise exception 'Administrative request fields cannot be changed by a member.' using errcode='42501';
  end if;
  return new;
end $$;
drop trigger if exists member_requests_member_field_guard on public.member_requests;
create trigger member_requests_member_field_guard before update on public.member_requests for each row execute function private.protect_member_request_fields();

-- Enable RLS on restored tables.
alter table public.service_request_types enable row level security;
alter table public.meeting_minutes enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.facility_types enable row level security;
alter table public.facility_images enable row level security;
alter table public.facility_responses enable row level security;
alter table public.facility_booking_responses enable row level security;

-- Remove legacy public-role policies on core operations tables.
drop policy if exists services_tenant_rls on public.services;
drop policy if exists events_tenant_rls on public.events;
drop policy if exists event_rsvps_tenant_rls on public.event_rsvps;
drop policy if exists volunteer_roles_tenant_rls on public.volunteer_roles;
drop policy if exists volunteers_tenant_rls on public.volunteers;
drop policy if exists member_requests_tenant_rls on public.member_requests;
drop policy if exists board_meetings_tenant_rls on public.board_meetings;
drop policy if exists ma_tenant_rls on public.meeting_attendees;
drop policy if exists mai_tenant_rls on public.meeting_action_items;
drop policy if exists facilities_tenant_rls on public.facilities;
drop policy if exists facility_bookings_tenant_rls on public.facility_bookings;
drop policy if exists facilities_public_read on public.facilities;
drop policy if exists facility_bookings_public_insert on public.facility_bookings;

-- Revoke broad anonymous grants, then add deliberate self/public grants.
revoke all on table public.services from anon;
revoke all on table public.service_attendance from anon;
revoke all on table public.events from anon;
revoke all on table public.event_rsvps from anon;
revoke all on table public.volunteer_roles from anon;
revoke all on table public.volunteers from anon;
revoke all on table public.member_requests from anon;
revoke all on table public.board_meetings from anon;
revoke all on table public.meeting_attendees from anon;
revoke all on table public.meeting_action_items from anon;
revoke all on table public.meeting_minutes from anon;
revoke all on table public.meeting_decisions from anon;
revoke all on table public.facilities from anon;
revoke all on table public.facility_bookings from anon;
revoke all on table public.facility_booking_responses from anon;
revoke all on table public.service_request_types from anon;
revoke all on table public.facility_types from anon;
revoke all on table public.facility_images from anon;
revoke all on table public.facility_responses from anon;

grant select on table public.services,public.events,public.volunteer_roles,public.service_request_types,public.facilities,public.facility_types,public.facility_images to anon;
grant select,insert,update,delete on table public.service_attendance,public.event_rsvps,public.volunteers,public.member_requests,public.facility_bookings to anon;
grant select on table public.facility_booking_responses to anon;
grant insert on table public.facility_responses to anon;

grant select,insert,update,delete on table public.service_request_types,public.meeting_minutes,public.meeting_decisions,public.facility_types,public.facility_images,public.facility_responses,public.facility_booking_responses to authenticated,service_role;

-- Explicit staff policies.
create policy services_staff_manage on public.services for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy events_staff_manage on public.events for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy event_rsvps_staff_manage on public.event_rsvps for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy volunteer_roles_staff_manage on public.volunteer_roles for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy volunteers_staff_manage on public.volunteers for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy member_requests_staff_manage on public.member_requests for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy board_meetings_staff_manage on public.board_meetings for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy meeting_attendees_staff_manage on public.meeting_attendees for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy meeting_action_items_staff_manage on public.meeting_action_items for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy meeting_minutes_staff_manage on public.meeting_minutes for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy meeting_decisions_staff_manage on public.meeting_decisions for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy facilities_staff_manage on public.facilities for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy facility_bookings_staff_manage on public.facility_bookings for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy facility_booking_responses_staff_manage on public.facility_booking_responses for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy service_request_types_staff_manage on public.service_request_types for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy facility_types_staff_manage on public.facility_types for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy facility_images_staff_manage on public.facility_images for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));
create policy facility_responses_staff_manage on public.facility_responses for all to authenticated using(private.actor_has_tenant(tenant_id)) with check(private.actor_has_tenant(tenant_id));

-- Member-session policies.
create policy services_member_read on public.services for select to anon
using(private.member_session_has_tenant(tenant_id) and is_published=true and status='published');
create policy events_member_read on public.events for select to anon
using(private.member_session_has_tenant(tenant_id) and is_published=true and status in ('published','completed'));

create policy service_attendance_member_read on public.service_attendance for select to anon
using(member_id=private.member_session_member_id(tenant_id));
create policy service_attendance_member_insert on public.service_attendance for insert to anon
with check(member_id=private.member_session_member_id(tenant_id) and status in ('attending','cancelled') and exists(select 1 from public.services s where s.id=service_attendance.service_id and s.tenant_id=service_attendance.tenant_id and s.is_published=true and s.status='published'));
create policy service_attendance_member_update on public.service_attendance for update to anon
using(member_id=private.member_session_member_id(tenant_id))
with check(member_id=private.member_session_member_id(tenant_id) and status in ('attending','cancelled'));
create policy service_attendance_member_delete on public.service_attendance for delete to anon
using(member_id=private.member_session_member_id(tenant_id));

create policy event_rsvps_member_read on public.event_rsvps for select to anon
using(member_id=private.member_session_member_id(tenant_id));
create policy event_rsvps_member_insert on public.event_rsvps for insert to anon
with check(member_id=private.member_session_member_id(tenant_id) and status in ('confirmed','cancelled') and exists(select 1 from public.events e where e.id=event_rsvps.event_id and e.tenant_id=event_rsvps.tenant_id and e.is_published=true and e.status in ('published','completed')));
create policy event_rsvps_member_update on public.event_rsvps for update to anon
using(member_id=private.member_session_member_id(tenant_id))
with check(member_id=private.member_session_member_id(tenant_id) and status in ('confirmed','cancelled'));
create policy event_rsvps_member_delete on public.event_rsvps for delete to anon
using(member_id=private.member_session_member_id(tenant_id));

create policy volunteer_roles_member_read on public.volunteer_roles for select to anon
using(private.member_session_has_tenant(tenant_id));
create policy volunteers_member_read on public.volunteers for select to anon
using(member_id=private.member_session_member_id(tenant_id));
create policy volunteers_member_insert on public.volunteers for insert to anon
with check(member_id=private.member_session_member_id(tenant_id) and status='confirmed' and exists(select 1 from public.volunteer_roles r where r.id=volunteers.role_id and r.tenant_id=volunteers.tenant_id and (r.max_volunteers is null or r.confirmed_count<r.max_volunteers)));
create policy volunteers_member_delete on public.volunteers for delete to anon
using(member_id=private.member_session_member_id(tenant_id));

create policy service_request_types_member_read on public.service_request_types for select to anon
using(is_active=true and private.member_session_has_tenant(tenant_id));
create policy member_requests_member_read on public.member_requests for select to anon
using(member_id=private.member_session_member_id(tenant_id));
create policy member_requests_member_insert on public.member_requests for insert to anon
with check(member_id=private.member_session_member_id(tenant_id) and status::text='open');
create policy member_requests_member_update on public.member_requests for update to anon
using(member_id=private.member_session_member_id(tenant_id) and status::text='open')
with check(member_id=private.member_session_member_id(tenant_id));
create policy member_requests_member_delete on public.member_requests for delete to anon
using(member_id=private.member_session_member_id(tenant_id) and status::text='open');

-- Public facilities may be browsed for the explicit public booking route.
create policy facilities_public_read_safe on public.facilities for select to anon using(is_active=true);
create policy facility_types_public_read_safe on public.facility_types for select to anon using(is_active=true);
create policy facility_images_public_read_safe on public.facility_images for select to anon using(exists(select 1 from public.facilities f where f.id=facility_images.facility_id and f.tenant_id=facility_images.tenant_id and f.is_active=true));

create policy facility_bookings_member_read on public.facility_bookings for select to anon
using(booked_by=private.member_session_member_id(tenant_id) and source='member');
create policy facility_bookings_member_insert on public.facility_bookings for insert to anon
with check(source='member' and booker_type='member' and status::text='open' and booked_by=private.member_session_member_id(tenant_id) and exists(select 1 from public.facilities f where f.id=facility_bookings.facility_id and f.tenant_id=facility_bookings.tenant_id and f.is_active=true));
create policy facility_bookings_member_update on public.facility_bookings for update to anon
using(booked_by=private.member_session_member_id(tenant_id) and source='member' and status::text='open')
with check(booked_by=private.member_session_member_id(tenant_id) and source='member' and status::text='cancelled' and rejection_reason='booker_withdrew');

create policy facility_bookings_public_insert on public.facility_bookings for insert to anon
with check(source='external' and booked_by is null and exists(select 1 from public.facilities f where f.id=facility_bookings.facility_id and f.tenant_id=facility_bookings.tenant_id and f.is_active=true));

create policy facility_booking_responses_member_read on public.facility_booking_responses for select to anon
using(member_id=private.member_session_member_id(tenant_id) and exists(select 1 from public.facility_bookings b where b.id=facility_booking_responses.booking_id and b.tenant_id=facility_booking_responses.tenant_id and b.booked_by=facility_booking_responses.member_id));
create policy facility_responses_public_insert on public.facility_responses for insert to anon
with check(source='external' and exists(select 1 from public.facilities f where f.id=facility_responses.facility_id and f.tenant_id=facility_responses.tenant_id and f.is_active=true));

create index if not exists service_request_types_tenant_active_idx on public.service_request_types(tenant_id,is_active,sort_order);
create index if not exists meeting_minutes_tenant_idx on public.meeting_minutes(tenant_id,meeting_id);
create index if not exists meeting_decisions_tenant_idx on public.meeting_decisions(tenant_id,meeting_id);
create index if not exists meeting_attendees_tenant_idx on public.meeting_attendees(tenant_id,meeting_id);
create index if not exists meeting_action_items_tenant_idx on public.meeting_action_items(tenant_id,meeting_id);
create index if not exists facility_types_tenant_idx on public.facility_types(tenant_id,is_active,sort_order);
create index if not exists facility_images_tenant_facility_idx on public.facility_images(tenant_id,facility_id);
create index if not exists facility_responses_tenant_idx on public.facility_responses(tenant_id,created_at desc);
create index if not exists facility_booking_responses_tenant_member_idx on public.facility_booking_responses(tenant_id,member_id,created_at desc);
create index if not exists facility_bookings_tenant_facility_date_idx on public.facility_bookings(tenant_id,facility_id,booking_date,start_time,end_time);
