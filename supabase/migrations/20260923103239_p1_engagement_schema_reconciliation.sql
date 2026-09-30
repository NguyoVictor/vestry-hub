begin;

-- P1 engagement schema reconciliation

create or replace function private.can_manage_communications(p_tenant_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_write_permission(p_tenant_id, 'communication_tools');
$$;
revoke all on function private.can_manage_communications(text) from public, anon;
grant execute on function private.can_manage_communications(text) to authenticated, service_role;

create or replace function private.can_manage_engagement_settings(p_tenant_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_write_permission(p_tenant_id, 'communication_tools')
      or private.can_write_permission(p_tenant_id, 'church_settings');
$$;
revoke all on function private.can_manage_engagement_settings(text) from public, anon;
grant execute on function private.can_manage_engagement_settings(text) to authenticated, service_role;

create table if not exists public.announcement_types (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  label text not null,
  description text,
  color varchar(7) not null default '#6366f1',
  icon varchar not null default 'megaphone',
  is_default boolean not null default false,
  is_active boolean not null default true,
  "order" integer not null default 0,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id)
);
create index if not exists announcement_types_tenant_order_idx on public.announcement_types(tenant_id, "order");
alter table public.announcement_types enable row level security;

alter table public.announcements
  add column if not exists category_id varchar,
  add column if not exists audience varchar not null default 'all',
  add column if not exists group_id varchar,
  add column if not exists status varchar not null default 'active',
  add column if not exists scheduled_at timestamptz,
  add column if not exists comments_enabled boolean not null default true,
  add column if not exists reactions_enabled boolean not null default true,
  add column if not exists rich_body text,
  add column if not exists view_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.announcements drop constraint if exists announcements_category_id_fkey;
alter table public.announcements add constraint announcements_category_id_fkey
  foreign key (category_id) references public.announcement_types(id) on delete set null;
alter table public.announcements drop constraint if exists announcements_group_id_fkey;
alter table public.announcements add constraint announcements_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete set null;
alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('all','specific_group','leaders_only'));
alter table public.announcements drop constraint if exists announcements_status_check;
alter table public.announcements add constraint announcements_status_check
  check (status in ('active','scheduled','archived','draft'));
create index if not exists announcements_tenant_status_created_idx on public.announcements(tenant_id,status,created_at desc);
create index if not exists announcements_group_idx on public.announcements(group_id) where group_id is not null;

create table if not exists public.announcement_attachments (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  announcement_id varchar not null references public.announcements(id) on delete cascade,
  type varchar not null check (type in ('image','video','pdf','file','link')),
  url text not null,
  filename text,
  size_bytes bigint,
  mime_type varchar,
  og_title text,
  og_description text,
  og_image_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists announcement_attachments_announcement_idx on public.announcement_attachments(announcement_id,display_order);
alter table public.announcement_attachments enable row level security;

create table if not exists public.announcement_reactions (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  announcement_id varchar not null references public.announcements(id) on delete cascade,
  member_id varchar not null references public.members(id) on delete cascade,
  emoji varchar not null check (emoji in ('🔥','❤️','🙏','🎉')),
  created_at timestamptz not null default now(),
  unique (announcement_id, member_id, emoji)
);
create index if not exists announcement_reactions_announcement_idx on public.announcement_reactions(announcement_id);
alter table public.announcement_reactions enable row level security;

create table if not exists public.announcement_comments (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  announcement_id varchar not null references public.announcements(id) on delete cascade,
  member_id varchar not null references public.members(id) on delete cascade,
  parent_id varchar references public.announcement_comments(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 4000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists announcement_comments_announcement_idx on public.announcement_comments(announcement_id,created_at);
alter table public.announcement_comments enable row level security;

create table if not exists public.announcement_read_receipts (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  announcement_id varchar not null references public.announcements(id) on delete cascade,
  member_id varchar not null references public.members(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, member_id)
);
create index if not exists announcement_read_receipts_announcement_idx on public.announcement_read_receipts(announcement_id);
alter table public.announcement_read_receipts enable row level security;

create or replace function private.member_can_view_announcement(p_announcement_id text, p_tenant_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.announcements a
    where a.id = p_announcement_id
      and a.tenant_id = p_tenant_id
      and private.member_session_has_tenant(a.tenant_id)
      and a.status = 'active'
      and (a.expires_at is null or a.expires_at >= now())
      and (
        coalesce(a.audience,'all') = 'all'
        or (a.audience = 'specific_group' and a.group_id is not null and private.member_session_in_group(a.group_id,a.tenant_id))
        or (a.audience = 'leaders_only' and exists (
          select 1 from public.members m
          where m.id = private.member_session_member_id(a.tenant_id)
            and m.tenant_id = a.tenant_id
            and lower(coalesce(m.member_type,'')) in ('leader','staff')
        ))
      )
  );
$$;
revoke all on function private.member_can_view_announcement(text,text) from public, anon;
grant execute on function private.member_can_view_announcement(text,text) to anon, authenticated, service_role;

drop policy if exists "announcements_tenant_rls" on public.announcements;
drop policy if exists "announcements_staff_read" on public.announcements;
drop policy if exists "announcements_staff_insert" on public.announcements;
drop policy if exists "announcements_staff_update" on public.announcements;
drop policy if exists "announcements_staff_delete" on public.announcements;
drop policy if exists "announcements_member_read" on public.announcements;
create policy "announcements_staff_read" on public.announcements for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "announcements_staff_insert" on public.announcements for insert to authenticated with check (private.can_manage_communications(tenant_id));
create policy "announcements_staff_update" on public.announcements for update to authenticated using (private.can_manage_communications(tenant_id)) with check (private.can_manage_communications(tenant_id));
create policy "announcements_staff_delete" on public.announcements for delete to authenticated using (private.can_manage_communications(tenant_id));
create policy "announcements_member_read" on public.announcements for select to anon using (private.member_can_view_announcement(id,tenant_id));

drop policy if exists "announcement_types_staff_read" on public.announcement_types;
drop policy if exists "announcement_types_staff_manage" on public.announcement_types;
drop policy if exists "announcement_types_member_read" on public.announcement_types;
drop policy if exists "announcement_types_staff_insert" on public.announcement_types;
drop policy if exists "announcement_types_staff_update" on public.announcement_types;
drop policy if exists "announcement_types_staff_delete" on public.announcement_types;
create policy "announcement_types_staff_read" on public.announcement_types for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "announcement_types_staff_insert" on public.announcement_types for insert to authenticated with check (private.can_manage_engagement_settings(tenant_id));
create policy "announcement_types_staff_update" on public.announcement_types for update to authenticated using (private.can_manage_engagement_settings(tenant_id)) with check (private.can_manage_engagement_settings(tenant_id));
create policy "announcement_types_staff_delete" on public.announcement_types for delete to authenticated using (private.can_manage_engagement_settings(tenant_id));
create policy "announcement_types_member_read" on public.announcement_types for select to anon using (is_active and private.member_session_has_tenant(tenant_id));

create or replace function private.apply_announcement_support_policies(p_table text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  execute format('drop policy if exists %I on public.%I', p_table||'_staff_read', p_table);
  execute format('drop policy if exists %I on public.%I', p_table||'_staff_manage', p_table);
  execute format('drop policy if exists %I on public.%I', p_table||'_staff_insert', p_table);
  execute format('drop policy if exists %I on public.%I', p_table||'_staff_update', p_table);
  execute format('drop policy if exists %I on public.%I', p_table||'_staff_delete', p_table);
  execute format('create policy %I on public.%I for select to authenticated using (private.actor_has_tenant(tenant_id))', p_table||'_staff_read', p_table);
  execute format('create policy %I on public.%I for insert to authenticated with check (private.can_manage_communications(tenant_id))', p_table||'_staff_insert', p_table);
  execute format('create policy %I on public.%I for update to authenticated using (private.can_manage_communications(tenant_id)) with check (private.can_manage_communications(tenant_id))', p_table||'_staff_update', p_table);
  execute format('create policy %I on public.%I for delete to authenticated using (private.can_manage_communications(tenant_id))', p_table||'_staff_delete', p_table);
end; $$;
revoke all on function private.apply_announcement_support_policies(text) from public, anon, authenticated;
grant execute on function private.apply_announcement_support_policies(text) to service_role;
select private.apply_announcement_support_policies('announcement_attachments');
select private.apply_announcement_support_policies('announcement_reactions');
select private.apply_announcement_support_policies('announcement_comments');
select private.apply_announcement_support_policies('announcement_read_receipts');
drop function private.apply_announcement_support_policies(text);

create policy "announcement_attachments_member_read" on public.announcement_attachments for select to anon using (private.member_can_view_announcement(announcement_id,tenant_id));
create policy "announcement_reactions_member_read" on public.announcement_reactions for select to anon using (private.member_can_view_announcement(announcement_id,tenant_id));
create policy "announcement_reactions_member_insert" on public.announcement_reactions for insert to anon with check (
  member_id = private.member_session_member_id(tenant_id)
  and private.member_can_view_announcement(announcement_id,tenant_id)
  and exists (select 1 from public.announcements a where a.id=announcement_id and a.tenant_id=tenant_id and a.reactions_enabled)
);
create policy "announcement_reactions_member_delete" on public.announcement_reactions for delete to anon using (member_id = private.member_session_member_id(tenant_id));
create policy "announcement_comments_member_read" on public.announcement_comments for select to anon using (private.member_can_view_announcement(announcement_id,tenant_id));
create policy "announcement_comments_member_insert" on public.announcement_comments for insert to anon with check (
  member_id = private.member_session_member_id(tenant_id)
  and private.member_can_view_announcement(announcement_id,tenant_id)
  and exists (select 1 from public.announcements a where a.id=announcement_id and a.tenant_id=tenant_id and a.comments_enabled)
);
create policy "announcement_comments_member_update" on public.announcement_comments for update to anon using (member_id = private.member_session_member_id(tenant_id)) with check (member_id = private.member_session_member_id(tenant_id));
create policy "announcement_comments_member_delete" on public.announcement_comments for delete to anon using (member_id = private.member_session_member_id(tenant_id));
create policy "announcement_read_receipts_member_read" on public.announcement_read_receipts for select to anon using (member_id = private.member_session_member_id(tenant_id));
create policy "announcement_read_receipts_member_insert" on public.announcement_read_receipts for insert to anon with check (member_id = private.member_session_member_id(tenant_id) and private.member_can_view_announcement(announcement_id,tenant_id));
create policy "announcement_read_receipts_member_update" on public.announcement_read_receipts for update to anon using (member_id = private.member_session_member_id(tenant_id)) with check (member_id = private.member_session_member_id(tenant_id));

create or replace function public.increment_announcement_type_usage(p_type_id varchar)
returns void language sql security definer set search_path = '' as $$
  update public.announcement_types t
  set usage_count=usage_count+1, updated_at=now()
  where t.id=p_type_id and private.can_manage_communications(t.tenant_id);
$$;
revoke all on function public.increment_announcement_type_usage(varchar) from public, anon;
grant execute on function public.increment_announcement_type_usage(varchar) to authenticated, service_role;

alter table public.surveys
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists closing_date date,
  add column if not exists target_audience text not null default 'everyone',
  add column if not exists target_group_id varchar references public.groups(id) on delete set null,
  add column if not exists view_count integer not null default 0;
alter table public.surveys drop constraint if exists surveys_target_audience_check;
alter table public.surveys add constraint surveys_target_audience_check check (target_audience in ('everyone','group'));

alter table public.survey_responses
  add column if not exists tenant_id varchar references public.tenants(id) on delete cascade,
  add column if not exists member_name text,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists time_taken_seconds integer check (time_taken_seconds is null or time_taken_seconds >= 0),
  add column if not exists is_complete boolean not null default false;
update public.survey_responses sr set tenant_id=s.tenant_id from public.surveys s where sr.survey_id=s.id and sr.tenant_id is null;
create index if not exists survey_responses_tenant_survey_idx on public.survey_responses(tenant_id,survey_id,submitted_at desc);

alter table public.survey_answers
  add column if not exists answer_text text,
  add column if not exists answer_options jsonb,
  add column if not exists answer_rating integer,
  add column if not exists answer_boolean boolean;

drop policy if exists "surveys_tenant_rls" on public.surveys;
drop policy if exists "surveys_public_read" on public.surveys;
drop policy if exists "surveys_staff_read" on public.surveys;
drop policy if exists "surveys_staff_insert" on public.surveys;
drop policy if exists "surveys_staff_update" on public.surveys;
drop policy if exists "surveys_staff_delete" on public.surveys;
create policy "surveys_staff_read" on public.surveys for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "surveys_staff_insert" on public.surveys for insert to authenticated with check (private.can_manage_communications(tenant_id));
create policy "surveys_staff_update" on public.surveys for update to authenticated using (private.can_manage_communications(tenant_id)) with check (private.can_manage_communications(tenant_id));
create policy "surveys_staff_delete" on public.surveys for delete to authenticated using (private.can_manage_communications(tenant_id));
create policy "surveys_public_read" on public.surveys for select to anon using (is_published and (closing_date is null or closing_date >= current_date));

drop policy if exists "survey_responses_tenant_rls" on public.survey_responses;
drop policy if exists "survey_responses_public_insert" on public.survey_responses;
drop policy if exists "survey_responses_public_read" on public.survey_responses;
drop policy if exists "survey_responses_staff_read" on public.survey_responses;
create policy "survey_responses_staff_read" on public.survey_responses for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "survey_responses_public_insert" on public.survey_responses for insert to anon with check (
  exists (select 1 from public.surveys s where s.id=survey_id and s.tenant_id=tenant_id and s.is_published and (s.closing_date is null or s.closing_date>=current_date))
  and (member_id is null or member_id=private.member_session_member_id(tenant_id))
);

drop policy if exists "survey_answers_rls" on public.survey_answers;
drop policy if exists "survey_answers_public_insert" on public.survey_answers;
drop policy if exists "survey_answers_staff_read" on public.survey_answers;
create policy "survey_answers_staff_read" on public.survey_answers for select to authenticated using (
  exists (select 1 from public.survey_responses sr where sr.id=response_id and private.actor_has_tenant(sr.tenant_id))
);
create policy "survey_answers_public_insert" on public.survey_answers for insert to anon with check (
  exists (select 1 from public.survey_responses sr join public.surveys s on s.id=sr.survey_id where sr.id=response_id and s.tenant_id=sr.tenant_id and s.is_published and (s.closing_date is null or s.closing_date>=current_date))
);

create or replace function public.increment_survey_view_count(survey_id varchar)
returns void language sql security definer set search_path = '' as $$
  update public.surveys s set view_count=view_count+1
  where s.id=survey_id and s.is_published and (s.closing_date is null or s.closing_date>=current_date);
$$;
revoke all on function public.increment_survey_view_count(varchar) from public;
grant execute on function public.increment_survey_view_count(varchar) to anon, authenticated, service_role;

create table if not exists public.appointment_types (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  label text not null,
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(id,tenant_id)
);
create index if not exists appointment_types_tenant_order_idx on public.appointment_types(tenant_id,sort_order);
alter table public.appointment_types enable row level security;

create table if not exists public.appointments (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  member_id varchar not null,
  appointment_type_id varchar,
  mode varchar not null default 'physical' check (mode in ('online','physical')),
  preferred_date date not null,
  preferred_time time not null,
  notes text,
  status varchar not null default 'pending' check (status in ('pending','confirmed','declined','rescheduled','cancelled','completed')),
  assigned_staff_id varchar references public.users(id) on delete set null,
  location text,
  physical_notes text,
  admin_notes text,
  jitsi_room_name text,
  rescheduled_date date,
  rescheduled_time time,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(member_id,tenant_id) references public.members(id,tenant_id) on delete cascade,
  foreign key(appointment_type_id,tenant_id) references public.appointment_types(id,tenant_id) on delete set null
);
create index if not exists appointments_tenant_date_idx on public.appointments(tenant_id,preferred_date,status);
create index if not exists appointments_member_idx on public.appointments(member_id,tenant_id,preferred_date desc);
alter table public.appointments enable row level security;

create policy "appointment_types_staff_read" on public.appointment_types for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "appointment_types_staff_insert" on public.appointment_types for insert to authenticated with check (private.can_manage_engagement_settings(tenant_id));
create policy "appointment_types_staff_update" on public.appointment_types for update to authenticated using (private.can_manage_engagement_settings(tenant_id)) with check (private.can_manage_engagement_settings(tenant_id));
create policy "appointment_types_staff_delete" on public.appointment_types for delete to authenticated using (private.can_manage_engagement_settings(tenant_id));
create policy "appointment_types_member_read" on public.appointment_types for select to anon using (is_active and private.member_session_has_tenant(tenant_id));
create policy "appointments_staff_read" on public.appointments for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "appointments_staff_insert" on public.appointments for insert to authenticated with check (private.can_manage_communications(tenant_id));
create policy "appointments_staff_update" on public.appointments for update to authenticated using (private.can_manage_communications(tenant_id)) with check (private.can_manage_communications(tenant_id));
create policy "appointments_staff_delete" on public.appointments for delete to authenticated using (private.can_manage_communications(tenant_id));
create policy "appointments_member_read" on public.appointments for select to anon using (member_id=private.member_session_member_id(tenant_id));
create policy "appointments_member_insert" on public.appointments for insert to anon with check (
  member_id=private.member_session_member_id(tenant_id)
  and status='pending'
  and assigned_staff_id is null
  and admin_notes is null
  and decline_reason is null
  and exists (select 1 from public.appointment_types t where t.id=appointment_type_id and t.tenant_id=appointments.tenant_id and t.is_active)
);

insert into public.appointment_types(tenant_id,label,description,is_active,is_default,sort_order)
select t.id,v.label,v.description,true,true,v.sort_order from public.tenants t
cross join (values
 ('Counselling Session','One-on-one pastoral counselling',0),
 ('Prayer Session','Personal prayer with a church leader',1),
 ('Pastoral Visit','Home or hospital visit by a pastor',2),
 ('Marriage Preparation','Pre-marital counselling sessions',3),
 ('Membership Consultation','Discuss church membership and next steps',4),
 ('General Meeting','General meeting with church leadership',5)
) v(label,description,sort_order)
where not exists (select 1 from public.appointment_types at where at.tenant_id=t.id);

create table if not exists public.testimony_categories (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  label text not null,
  color varchar(7) not null default '#6366f1',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,tenant_id)
);
create index if not exists testimony_categories_tenant_order_idx on public.testimony_categories(tenant_id,sort_order);
alter table public.testimony_categories enable row level security;

alter table public.testimonies
  alter column member_id drop not null,
  add column if not exists status varchar not null default 'pending',
  add column if not exists author_name varchar,
  add column if not exists category varchar default 'other',
  add column if not exists category_id varchar,
  add column if not exists testimony_date date,
  add column if not exists date_of_testimony date,
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists allow_featuring boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists view_count integer not null default 0,
  add column if not exists submitted_by_member_id varchar,
  add column if not exists submitted_by_admin_id varchar,
  add column if not exists updated_at timestamptz not null default now();
alter table public.testimonies drop constraint if exists testimonies_status_check;
alter table public.testimonies add constraint testimonies_status_check check (status in ('pending','published','approved','declined','retracted'));
alter table public.testimonies drop constraint if exists testimonies_category_id_fkey;
alter table public.testimonies add constraint testimonies_category_id_fkey foreign key(category_id) references public.testimony_categories(id) on delete set null;
create index if not exists testimonies_tenant_status_idx on public.testimonies(tenant_id,status,created_at desc);

create table if not exists public.testimony_reactions (
  id varchar primary key default gen_random_uuid()::text,
  tenant_id varchar not null references public.tenants(id) on delete cascade,
  testimony_id varchar not null references public.testimonies(id) on delete cascade,
  member_id varchar not null references public.members(id) on delete cascade,
  reaction_type varchar not null check (reaction_type in ('amen','touched','inspiring')),
  created_at timestamptz not null default now(),
  unique(testimony_id,member_id)
);
create index if not exists testimony_reactions_testimony_idx on public.testimony_reactions(testimony_id);
alter table public.testimony_reactions enable row level security;

drop policy if exists "testimonies_tenant_rls" on public.testimonies;
drop policy if exists "testimonies_staff_read" on public.testimonies;
drop policy if exists "testimonies_staff_insert" on public.testimonies;
drop policy if exists "testimonies_staff_update" on public.testimonies;
drop policy if exists "testimonies_staff_delete" on public.testimonies;
drop policy if exists "testimonies_member_read" on public.testimonies;
drop policy if exists "testimonies_member_insert" on public.testimonies;
drop policy if exists "testimonies_member_update" on public.testimonies;
drop policy if exists "testimonies_member_delete" on public.testimonies;
create policy "testimonies_staff_read" on public.testimonies for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "testimonies_staff_insert" on public.testimonies for insert to authenticated with check (private.can_manage_communications(tenant_id));
create policy "testimonies_staff_update" on public.testimonies for update to authenticated using (private.can_manage_communications(tenant_id)) with check (private.can_manage_communications(tenant_id));
create policy "testimonies_staff_delete" on public.testimonies for delete to authenticated using (private.can_manage_communications(tenant_id));
create policy "testimonies_member_read" on public.testimonies for select to anon using (
  private.member_session_has_tenant(tenant_id)
  and (status in ('published','approved') or member_id=private.member_session_member_id(tenant_id))
);
create policy "testimonies_member_insert" on public.testimonies for insert to anon with check (
  member_id=private.member_session_member_id(tenant_id)
  and status='pending' and coalesce(is_approved,false)=false
  and approved_by is null and is_featured=false
);
create policy "testimonies_member_update" on public.testimonies for update to anon using (
  member_id=private.member_session_member_id(tenant_id) and status in ('pending','declined')
) with check (
  member_id=private.member_session_member_id(tenant_id) and status='pending'
  and coalesce(is_approved,false)=false and approved_by is null and is_featured=false
);
create policy "testimonies_member_delete" on public.testimonies for delete to anon using (
  member_id=private.member_session_member_id(tenant_id) and status in ('pending','declined')
);

create policy "testimony_categories_staff_read" on public.testimony_categories for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "testimony_categories_staff_insert" on public.testimony_categories for insert to authenticated with check (private.can_manage_engagement_settings(tenant_id));
create policy "testimony_categories_staff_update" on public.testimony_categories for update to authenticated using (private.can_manage_engagement_settings(tenant_id)) with check (private.can_manage_engagement_settings(tenant_id));
create policy "testimony_categories_staff_delete" on public.testimony_categories for delete to authenticated using (private.can_manage_engagement_settings(tenant_id));
create policy "testimony_categories_member_read" on public.testimony_categories for select to anon using (is_active and private.member_session_has_tenant(tenant_id));
create policy "testimony_reactions_staff_read" on public.testimony_reactions for select to authenticated using (private.actor_has_tenant(tenant_id));
create policy "testimony_reactions_member_read" on public.testimony_reactions for select to anon using (
  private.member_session_has_tenant(tenant_id) and exists(select 1 from public.testimonies t where t.id=testimony_id and t.tenant_id=testimony_reactions.tenant_id and t.status in ('published','approved'))
);
create policy "testimony_reactions_member_insert" on public.testimony_reactions for insert to anon with check (
  member_id=private.member_session_member_id(tenant_id) and exists(select 1 from public.testimonies t where t.id=testimony_id and t.tenant_id=testimony_reactions.tenant_id and t.status in ('published','approved'))
);
create policy "testimony_reactions_member_delete" on public.testimony_reactions for delete to anon using (member_id=private.member_session_member_id(tenant_id));

create or replace function private.notify_engagement_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_body text;
begin
  if TG_TABLE_NAME='appointments' then
    v_title := 'New Appointment Request';
    v_body := 'A member submitted a new appointment request.';
  else
    v_title := 'New Testimony Submitted';
    v_body := case when NEW.is_anonymous then 'A member shared a new testimony.' else 'A member shared a new testimony: '||coalesce(NEW.title,'') end;
  end if;
  insert into public.notifications(tenant_id,user_id,type,title,body,is_read)
  select NEW.tenant_id,u.id,case when TG_TABLE_NAME='appointments' then 'appointment' else 'testimony_submitted' end,v_title,v_body,false
  from public.users u
  where u.tenant_id=NEW.tenant_id and u.status='active' and lower(coalesce(u.role,'')) <> 'member';
  return NEW;
end; $$;
revoke all on function private.notify_engagement_submission() from public,anon,authenticated;
grant execute on function private.notify_engagement_submission() to service_role;

drop trigger if exists appointment_submission_notify on public.appointments;
create trigger appointment_submission_notify after insert on public.appointments for each row execute function private.notify_engagement_submission();
drop trigger if exists testimony_submission_notify on public.testimonies;
create trigger testimony_submission_notify after insert on public.testimonies for each row when (NEW.member_id is not null and NEW.status='pending') execute function private.notify_engagement_submission();

commit;