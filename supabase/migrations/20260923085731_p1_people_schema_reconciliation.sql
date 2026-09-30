-- P1 PEOPLE SCHEMA RECONCILIATION
alter table public.groups
  add column if not exists meeting_type text default 'onsite' check (meeting_type in ('online','onsite','hybrid')),
  add column if not exists jitsi_room_name text,
  add column if not exists max_members integer,
  add column if not exists visibility text default 'private' check (visibility in ('public','private')),
  add column if not exists tags text[],
  add column if not exists location text,
  add column if not exists meeting_date date,
  add column if not exists group_type_id text references public.group_types(id) on delete set null;

update public.groups set location=meeting_location where location is null and meeting_location is not null;
create index if not exists groups_group_type_id_idx on public.groups(group_type_id);
create index if not exists groups_tenant_visibility_idx on public.groups(tenant_id,visibility,is_active);

create unique index if not exists groups_id_tenant_unique on public.groups(id,tenant_id);
create unique index if not exists members_id_tenant_unique on public.members(id,tenant_id);
create unique index if not exists house_fellowships_id_tenant_unique on public.house_fellowships(id,tenant_id);
create unique index if not exists families_id_tenant_unique on public.families(id,tenant_id);
create unique index if not exists services_id_tenant_unique on public.services(id,tenant_id);

create or replace function private.member_session_token()
returns text language sql stable security invoker
set search_path=public,private,pg_temp
as $$
  select nullif(trim(coalesce((coalesce(current_setting('request.headers',true),'{}')::jsonb ->> 'x-member-session'),'')),'');
$$;

create or replace function private.member_session_member_id(p_tenant_id varchar)
returns varchar language sql stable security definer
set search_path=public,private,pg_temp
as $$
  select ms.member_id
  from public.member_sessions ms
  join public.members m on m.id=ms.member_id and m.tenant_id=ms.tenant_id
  where ms.session_token=private.member_session_token()
    and ms.tenant_id=p_tenant_id
    and ms.expires_at>now()
    and coalesce(m.status,'active')<>'inactive'
    and coalesce(m.membership_status,'active')<>'Pending Approval'
  order by ms.expires_at desc limit 1;
$$;

create or replace function private.member_session_has_tenant(p_tenant_id varchar)
returns boolean language sql stable security definer
set search_path=public,private,pg_temp
as $$ select private.member_session_member_id(p_tenant_id) is not null; $$;

revoke all on function private.member_session_token() from public,anon,authenticated;
revoke all on function private.member_session_member_id(varchar) from public,anon,authenticated;
revoke all on function private.member_session_has_tenant(varchar) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.member_session_member_id(varchar) to anon,authenticated,service_role;
grant execute on function private.member_session_has_tenant(varchar) to anon,authenticated,service_role;

create table if not exists public.join_requests (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  group_id varchar not null,
  member_id varchar not null,
  status varchar not null default 'pending' check(status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(group_id,tenant_id) references public.groups(id,tenant_id) on delete cascade,
  foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade,
  unique(group_id,member_id)
);
create index if not exists join_requests_tenant_status_idx on public.join_requests(tenant_id,status,created_at desc);

create table if not exists public.fellowship_attendance (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  fellowship_id varchar not null,
  member_id varchar not null,
  session_date date not null,
  status varchar not null default 'present' check(status in ('present','absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(fellowship_id,tenant_id) references public.house_fellowships(id,tenant_id) on delete cascade,
  foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade,
  unique(fellowship_id,session_date,member_id)
);
create index if not exists fellowship_attendance_tenant_date_idx on public.fellowship_attendance(tenant_id,session_date desc);

create table if not exists public.fellowship_rsvp (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  fellowship_id varchar not null,
  member_id varchar not null,
  session_date date not null,
  status varchar not null default 'attending' check(status in ('attending','not_attending','maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(fellowship_id,tenant_id) references public.house_fellowships(id,tenant_id) on delete cascade,
  foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade,
  unique(fellowship_id,member_id,session_date)
);
create index if not exists fellowship_rsvp_tenant_date_idx on public.fellowship_rsvp(tenant_id,session_date desc);

create table if not exists public.children_classes (
  id varchar primary key default ('cls_'||substr(md5(random()::text),1,12)),
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  name varchar not null,
  min_age integer not null default 0,
  max_age integer not null default 12,
  teacher_id varchar,
  capacity integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(min_age>=0 and max_age>=min_age),
  foreign key(teacher_id,tenant_id) references public.members(id,tenant_id) on delete set null (teacher_id)
);
create unique index if not exists children_classes_id_tenant_unique on public.children_classes(id,tenant_id);
create index if not exists children_classes_tenant_active_idx on public.children_classes(tenant_id,active,min_age);

create table if not exists public.children (
  id varchar primary key default ('chd_'||substr(md5(random()::text),1,12)),
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  family_id varchar,
  first_name varchar not null,
  last_name varchar not null,
  date_of_birth date not null,
  gender varchar check(gender in ('male','female','prefer_not_to_say')),
  class_id varchar,
  guardian_primary_id varchar,
  guardian_secondary_id varchar,
  photo_url text,
  special_needs_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(family_id,tenant_id) references public.families(id,tenant_id) on delete set null (family_id),
  foreign key(class_id,tenant_id) references public.children_classes(id,tenant_id) on delete set null (class_id),
  foreign key(guardian_primary_id,tenant_id) references public.members(id,tenant_id) on delete set null (guardian_primary_id),
  foreign key(guardian_secondary_id,tenant_id) references public.members(id,tenant_id) on delete set null (guardian_secondary_id)
);
create unique index if not exists children_id_tenant_unique on public.children(id,tenant_id);
create index if not exists children_tenant_active_idx on public.children(tenant_id,active,last_name,first_name);
create index if not exists children_guardian_primary_idx on public.children(tenant_id,guardian_primary_id) where guardian_primary_id is not null;
create index if not exists children_guardian_secondary_idx on public.children(tenant_id,guardian_secondary_id) where guardian_secondary_id is not null;

create table if not exists public.children_checkins (
  id varchar primary key default ('cin_'||substr(md5(random()::text),1,12)),
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  child_id varchar not null,
  service_id varchar,
  checked_in_at timestamptz not null default now(),
  checked_in_by varchar references public.users(id) on delete set null,
  checked_out_at timestamptz,
  checked_out_by varchar references public.users(id) on delete set null,
  check_in_method varchar not null default 'manual' check(check_in_method in ('qr','manual')),
  qr_code_data text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key(child_id,tenant_id) references public.children(id,tenant_id) on delete cascade,
  foreign key(service_id,tenant_id) references public.services(id,tenant_id) on delete set null (service_id),
  check(checked_out_at is null or checked_out_at>=checked_in_at)
);
create index if not exists children_checkins_tenant_date_idx on public.children_checkins(tenant_id,checked_in_at desc);
create index if not exists children_checkins_child_date_idx on public.children_checkins(child_id,checked_in_at desc);

create table if not exists public.children_qr_codes (
  id varchar primary key default ('qrc_'||substr(md5(random()::text),1,12)),
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  child_id varchar not null,
  service_id varchar,
  qr_data varchar not null unique,
  sent_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(child_id,tenant_id) references public.children(id,tenant_id) on delete cascade,
  foreign key(service_id,tenant_id) references public.services(id,tenant_id) on delete set null (service_id),
  check(expires_at>created_at)
);
create index if not exists children_qr_codes_tenant_expiry_idx on public.children_qr_codes(tenant_id,expires_at desc);

create table if not exists public.children_ministry_settings (
  id varchar primary key default ('cms_'||substr(md5(random()::text),1,12)),
  tenant_id varchar not null unique references public.tenants(id) on delete cascade,
  kiosk_pin varchar not null default '1234',
  kiosk_idle_timeout_minutes integer not null default 1 check(kiosk_idle_timeout_minutes between 1 and 120),
  kiosk_auto_return_seconds integer not null default 3 check(kiosk_auto_return_seconds between 1 and 300),
  auto_send_qr_on_confirm boolean not null default true,
  send_qr_reminder boolean not null default true,
  qr_reminder_days_before integer not null default 1,
  notify_checkin boolean not null default true,
  notify_checkout boolean not null default true,
  email_qr_to_parents boolean not null default false,
  auto_assign_class_by_age boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.join_requests enable row level security;
alter table public.fellowship_attendance enable row level security;
alter table public.fellowship_rsvp enable row level security;
alter table public.children_classes enable row level security;
alter table public.children enable row level security;
alter table public.children_checkins enable row level security;
alter table public.children_qr_codes enable row level security;
alter table public.children_ministry_settings enable row level security;

revoke all on table public.join_requests from public, anon, authenticated;
revoke all on table public.fellowship_attendance from public, anon, authenticated;
revoke all on table public.fellowship_rsvp from public, anon, authenticated;
revoke all on table public.children_classes from public, anon, authenticated;
revoke all on table public.children from public, anon, authenticated;
revoke all on table public.children_checkins from public, anon, authenticated;
revoke all on table public.children_qr_codes from public, anon, authenticated;
revoke all on table public.children_ministry_settings from public, anon, authenticated;

grant select,insert,update,delete on table public.join_requests to authenticated,service_role;
grant select,insert,update,delete on table public.fellowship_attendance to authenticated,service_role;
grant select,insert,update,delete on table public.fellowship_rsvp to authenticated,service_role;
grant select,insert,update,delete on table public.children_classes to authenticated,service_role;
grant select,insert,update,delete on table public.children to authenticated,service_role;
grant select,insert,update,delete on table public.children_checkins to authenticated,service_role;
grant select,insert,update,delete on table public.children_qr_codes to authenticated,service_role;
grant select,insert,update,delete on table public.children_ministry_settings to authenticated,service_role;

grant select,insert,delete on table public.join_requests to anon;
grant select on table public.fellowship_attendance to anon;
grant select,insert,update,delete on table public.fellowship_rsvp to anon;
grant select on table public.children_classes to anon;
grant select on table public.children to anon;
grant select on table public.children_checkins to anon;
grant select on table public.children_qr_codes to anon;

create policy join_requests_staff_manage on public.join_requests for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy fellowship_attendance_staff_manage on public.fellowship_attendance for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy fellowship_rsvp_staff_manage on public.fellowship_rsvp for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy children_classes_staff_manage on public.children_classes for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy children_staff_manage on public.children for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy children_checkins_staff_manage on public.children_checkins for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy children_qr_codes_staff_manage on public.children_qr_codes for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));
create policy children_ministry_settings_staff_manage on public.children_ministry_settings for all to authenticated using(private.can_manage_people(tenant_id)) with check(private.can_manage_people(tenant_id));

create policy join_requests_member_read on public.join_requests for select to anon using(member_id=private.member_session_member_id(tenant_id));
create policy join_requests_member_create on public.join_requests for insert to anon with check(status='pending' and member_id=private.member_session_member_id(tenant_id) and exists(select 1 from public.groups g where g.id=join_requests.group_id and g.tenant_id=join_requests.tenant_id and g.is_active=true and coalesce(g.visibility,'private')='public'));
create policy join_requests_member_delete on public.join_requests for delete to anon using(status='pending' and member_id=private.member_session_member_id(tenant_id));
create policy fellowship_attendance_member_read on public.fellowship_attendance for select to anon using(member_id=private.member_session_member_id(tenant_id));
create policy fellowship_rsvp_member_read on public.fellowship_rsvp for select to anon using(member_id=private.member_session_member_id(tenant_id));
create policy fellowship_rsvp_member_insert on public.fellowship_rsvp for insert to anon with check(member_id=private.member_session_member_id(tenant_id) and exists(select 1 from public.fellowship_members fm where fm.fellowship_id=fellowship_rsvp.fellowship_id and fm.member_id=fellowship_rsvp.member_id and fm.tenant_id=fellowship_rsvp.tenant_id));
create policy fellowship_rsvp_member_update on public.fellowship_rsvp for update to anon using(member_id=private.member_session_member_id(tenant_id)) with check(member_id=private.member_session_member_id(tenant_id));
create policy fellowship_rsvp_member_delete on public.fellowship_rsvp for delete to anon using(member_id=private.member_session_member_id(tenant_id));
create policy children_classes_member_read on public.children_classes for select to anon using(active=true and private.member_session_has_tenant(tenant_id));
create policy children_member_read on public.children for select to anon using(active=true and private.member_session_member_id(tenant_id) in (guardian_primary_id,guardian_secondary_id));
create policy children_checkins_member_read on public.children_checkins for select to anon using(exists(select 1 from public.children c where c.id=children_checkins.child_id and c.tenant_id=children_checkins.tenant_id and private.member_session_member_id(c.tenant_id) in (c.guardian_primary_id,c.guardian_secondary_id)));
create policy children_qr_codes_member_read on public.children_qr_codes for select to anon using(exists(select 1 from public.children c where c.id=children_qr_codes.child_id and c.tenant_id=children_qr_codes.tenant_id and private.member_session_member_id(c.tenant_id) in (c.guardian_primary_id,c.guardian_secondary_id)));
