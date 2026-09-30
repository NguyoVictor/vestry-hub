create unique index if not exists announcements_id_tenant_unique
  on public.announcements(id, tenant_id);
create unique index if not exists surveys_id_tenant_unique
  on public.surveys(id, tenant_id);
create unique index if not exists survey_responses_id_tenant_unique
  on public.survey_responses(id, tenant_id);

alter table public.announcements
  drop constraint if exists announcements_category_tenant_fkey;
alter table public.announcements
  add constraint announcements_category_tenant_fkey
  foreign key (category_id, tenant_id)
  references public.announcement_types(id, tenant_id);

alter table public.announcements
  drop constraint if exists announcements_group_tenant_fkey;
alter table public.announcements
  add constraint announcements_group_tenant_fkey
  foreign key (group_id, tenant_id)
  references public.groups(id, tenant_id);

alter table public.announcement_attachments
  drop constraint if exists announcement_attachments_announcement_id_fkey;
alter table public.announcement_attachments
  drop constraint if exists announcement_attachments_announcement_tenant_fkey;
alter table public.announcement_attachments
  add constraint announcement_attachments_announcement_tenant_fkey
  foreign key (announcement_id, tenant_id)
  references public.announcements(id, tenant_id)
  on delete cascade;

alter table public.announcement_reactions
  drop constraint if exists announcement_reactions_announcement_id_fkey;
alter table public.announcement_reactions
  drop constraint if exists announcement_reactions_announcement_tenant_fkey;
alter table public.announcement_reactions
  add constraint announcement_reactions_announcement_tenant_fkey
  foreign key (announcement_id, tenant_id)
  references public.announcements(id, tenant_id)
  on delete cascade;

alter table public.announcement_comments
  drop constraint if exists announcement_comments_announcement_id_fkey;
alter table public.announcement_comments
  drop constraint if exists announcement_comments_announcement_tenant_fkey;
alter table public.announcement_comments
  add constraint announcement_comments_announcement_tenant_fkey
  foreign key (announcement_id, tenant_id)
  references public.announcements(id, tenant_id)
  on delete cascade;

create unique index if not exists announcement_comments_id_tenant_unique
  on public.announcement_comments(id, tenant_id);
alter table public.announcement_comments
  drop constraint if exists announcement_comments_parent_tenant_fkey;
alter table public.announcement_comments
  add constraint announcement_comments_parent_tenant_fkey
  foreign key (parent_id, tenant_id)
  references public.announcement_comments(id, tenant_id)
  on delete cascade;

alter table public.announcement_read_receipts
  drop constraint if exists announcement_read_receipts_announcement_id_fkey;
alter table public.announcement_read_receipts
  drop constraint if exists announcement_read_receipts_announcement_tenant_fkey;
alter table public.announcement_read_receipts
  add constraint announcement_read_receipts_announcement_tenant_fkey
  foreign key (announcement_id, tenant_id)
  references public.announcements(id, tenant_id)
  on delete cascade;

alter table public.surveys
  drop constraint if exists surveys_target_group_tenant_fkey;
alter table public.surveys
  add constraint surveys_target_group_tenant_fkey
  foreign key (target_group_id, tenant_id)
  references public.groups(id, tenant_id);

update public.survey_responses sr
set tenant_id=s.tenant_id
from public.surveys s
where sr.survey_id=s.id and sr.tenant_id is null;
alter table public.survey_responses alter column tenant_id set not null;

alter table public.survey_responses
  drop constraint if exists survey_responses_survey_id_fkey;
alter table public.survey_responses
  drop constraint if exists survey_responses_survey_tenant_fkey;
alter table public.survey_responses
  add constraint survey_responses_survey_tenant_fkey
  foreign key (survey_id, tenant_id)
  references public.surveys(id, tenant_id)
  on delete cascade;

alter table public.survey_responses
  drop constraint if exists survey_responses_member_id_fkey;
alter table public.survey_responses
  drop constraint if exists survey_responses_member_tenant_fkey;
alter table public.survey_responses
  add constraint survey_responses_member_id_fkey
  foreign key (member_id)
  references public.members(id)
  on delete set null;
alter table public.survey_responses
  add constraint survey_responses_member_tenant_fkey
  foreign key (member_id, tenant_id)
  references public.members(id, tenant_id);

create or replace function private.can_read_engagement_staff(p_tenant_id text)
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
      where u.id=(select auth.uid())::text
        and u.tenant_id=p_tenant_id
        and u.status='active'
        and length(trim(coalesce(u.role,'')))>0
        and lower(coalesce(u.role,'')) not in ('member','guest')
    );
$$;
revoke all on function private.can_read_engagement_staff(text) from public, anon;
grant execute on function private.can_read_engagement_staff(text) to authenticated, service_role;

create or replace function private.can_manage_engagement_staff(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_read_engagement_staff(p_tenant_id)
     and private.can_write_permission(p_tenant_id, 'communication_tools');
$$;
revoke all on function private.can_manage_engagement_staff(text) from public, anon;
grant execute on function private.can_manage_engagement_staff(text) to authenticated, service_role;

create or replace function private.can_manage_communications(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_engagement_staff(p_tenant_id);
$$;

create or replace function private.can_manage_engagement_settings(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_read_engagement_staff(p_tenant_id)
     and (
       private.can_write_permission(p_tenant_id, 'communication_tools')
       or private.can_write_permission(p_tenant_id, 'church_settings')
     );
$$;

create or replace function private.member_can_view_survey(p_survey_id text, p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.surveys s
    where s.id=p_survey_id
      and s.tenant_id=p_tenant_id
      and s.is_published
      and (s.closing_date is null or s.closing_date>=current_date)
      and (
        s.target_audience='everyone'
        or (
          s.target_audience='group'
          and s.target_group_id is not null
          and private.member_session_in_group(s.target_group_id,s.tenant_id)
        )
      )
  );
$$;
revoke all on function private.member_can_view_survey(text,text) from public;
grant execute on function private.member_can_view_survey(text,text) to anon, authenticated, service_role;

drop policy if exists announcements_staff_read on public.announcements;
drop policy if exists announcements_staff_insert on public.announcements;
drop policy if exists announcements_staff_update on public.announcements;
drop policy if exists announcements_staff_delete on public.announcements;
create policy announcements_staff_read on public.announcements
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy announcements_staff_insert on public.announcements
  for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy announcements_staff_update on public.announcements
  for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
  with check (private.can_manage_engagement_staff(tenant_id));
create policy announcements_staff_delete on public.announcements
  for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists announcement_types_staff_read on public.announcement_types;
drop policy if exists announcement_types_staff_insert on public.announcement_types;
drop policy if exists announcement_types_staff_update on public.announcement_types;
drop policy if exists announcement_types_staff_delete on public.announcement_types;
create policy announcement_types_staff_read on public.announcement_types
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy announcement_types_staff_insert on public.announcement_types
  for insert to authenticated with check (private.can_manage_engagement_settings(tenant_id));
create policy announcement_types_staff_update on public.announcement_types
  for update to authenticated using (private.can_manage_engagement_settings(tenant_id))
  with check (private.can_manage_engagement_settings(tenant_id));
create policy announcement_types_staff_delete on public.announcement_types
  for delete to authenticated using (private.can_manage_engagement_settings(tenant_id));

drop policy if exists announcement_attachments_staff_read on public.announcement_attachments;
drop policy if exists announcement_attachments_staff_insert on public.announcement_attachments;
drop policy if exists announcement_attachments_staff_update on public.announcement_attachments;
drop policy if exists announcement_attachments_staff_delete on public.announcement_attachments;
create policy announcement_attachments_staff_read on public.announcement_attachments
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy announcement_attachments_staff_insert on public.announcement_attachments
  for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_attachments_staff_update on public.announcement_attachments
  for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
  with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_attachments_staff_delete on public.announcement_attachments
  for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists announcement_reactions_staff_read on public.announcement_reactions;
drop policy if exists announcement_reactions_staff_insert on public.announcement_reactions;
drop policy if exists announcement_reactions_staff_update on public.announcement_reactions;
drop policy if exists announcement_reactions_staff_delete on public.announcement_reactions;
create policy announcement_reactions_staff_read on public.announcement_reactions
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy announcement_reactions_staff_insert on public.announcement_reactions
  for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_reactions_staff_update on public.announcement_reactions
  for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
  with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_reactions_staff_delete on public.announcement_reactions
  for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists announcement_comments_staff_read on public.announcement_comments;
drop policy if exists announcement_comments_staff_insert on public.announcement_comments;
drop policy if exists announcement_comments_staff_update on public.announcement_comments;
drop policy if exists announcement_comments_staff_delete on public.announcement_comments;
create policy announcement_comments_staff_read on public.announcement_comments
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy announcement_comments_staff_insert on public.announcement_comments
  for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_comments_staff_update on public.announcement_comments
  for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
  with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_comments_staff_delete on public.announcement_comments
  for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists announcement_read_receipts_staff_read on public.announcement_read_receipts;
drop policy if exists announcement_read_receipts_staff_insert on public.announcement_read_receipts;
drop policy if exists announcement_read_receipts_staff_update on public.announcement_read_receipts;
drop policy if exists announcement_read_receipts_staff_delete on public.announcement_read_receipts;
create policy announcement_read_receipts_staff_read on public.announcement_read_receipts
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy announcement_read_receipts_staff_insert on public.announcement_read_receipts
  for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_read_receipts_staff_update on public.announcement_read_receipts
  for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
  with check (private.can_manage_engagement_staff(tenant_id));
create policy announcement_read_receipts_staff_delete on public.announcement_read_receipts
  for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));

drop policy if exists surveys_staff_read on public.surveys;
drop policy if exists surveys_staff_insert on public.surveys;
drop policy if exists surveys_staff_update on public.surveys;
drop policy if exists surveys_staff_delete on public.surveys;
drop policy if exists surveys_public_read on public.surveys;
create policy surveys_staff_read on public.surveys
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy surveys_staff_insert on public.surveys
  for insert to authenticated with check (private.can_manage_engagement_staff(tenant_id));
create policy surveys_staff_update on public.surveys
  for update to authenticated using (private.can_manage_engagement_staff(tenant_id))
  with check (private.can_manage_engagement_staff(tenant_id));
create policy surveys_staff_delete on public.surveys
  for delete to authenticated using (private.can_manage_engagement_staff(tenant_id));
create policy surveys_public_read on public.surveys
  for select to anon using (private.member_can_view_survey(id,tenant_id));

drop policy if exists survey_responses_staff_read on public.survey_responses;
drop policy if exists survey_responses_public_insert on public.survey_responses;
drop policy if exists survey_responses_member_read on public.survey_responses;
create policy survey_responses_staff_read on public.survey_responses
  for select to authenticated using (private.can_read_engagement_staff(tenant_id));
create policy survey_responses_member_read on public.survey_responses
  for select to anon using (
    member_id is not null
    and member_id=private.member_session_member_id(tenant_id)
  );

drop policy if exists survey_answers_staff_read on public.survey_answers;
drop policy if exists survey_answers_public_insert on public.survey_answers;
create policy survey_answers_staff_read on public.survey_answers
  for select to authenticated using (
    exists (
      select 1 from public.survey_responses sr
      where sr.id=response_id
        and private.can_read_engagement_staff(sr.tenant_id)
    )
  );

revoke insert on table public.survey_responses from anon;
revoke insert on table public.survey_answers from anon;

create or replace function private.submit_survey_response(
  p_survey_id text,
  p_tenant_id text,
  p_member_id text,
  p_member_name text,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_time_taken_seconds integer,
  p_responses jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response_id text;
  v_questions jsonb;
  v_is_anonymous boolean;
  v_question jsonb;
  v_index integer;
  v_value jsonb;
  v_required boolean;
begin
  if not private.member_can_view_survey(p_survey_id,p_tenant_id) then
    raise exception 'Survey is not available.' using errcode='42501';
  end if;

  select s.questions, s.is_anonymous
  into v_questions, v_is_anonymous
  from public.surveys s
  where s.id=p_survey_id and s.tenant_id=p_tenant_id;

  if p_member_id is not null
     and p_member_id<>private.member_session_member_id(p_tenant_id) then
    raise exception 'Invalid survey member.' using errcode='42501';
  end if;

  if v_is_anonymous then
    p_member_id := null;
    p_member_name := null;
  end if;

  for v_question, v_index in
    select value, (ordinality-1)::integer
    from jsonb_array_elements(v_questions) with ordinality
  loop
    v_value := p_responses -> v_index::text;
    v_required := coalesce((v_question->>'required')::boolean,false);
    if v_required and (
      v_value is null
      or v_value='null'::jsonb
      or (jsonb_typeof(v_value)='string' and btrim(v_value #>> '{}')='')
      or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
    ) then
      raise exception 'A required survey question is unanswered.' using errcode='23514';
    end if;
  end loop;

  insert into public.survey_responses(
    survey_id, tenant_id, member_id, member_name, started_at, completed_at,
    time_taken_seconds, is_complete, responses
  )
  values(
    p_survey_id, p_tenant_id, p_member_id, p_member_name,
    coalesce(p_started_at,now()), coalesce(p_completed_at,now()),
    greatest(coalesce(p_time_taken_seconds,0),0), true, coalesce(p_responses,'{}'::jsonb)
  )
  returning id into v_response_id;

  for v_question, v_index in
    select value, (ordinality-1)::integer
    from jsonb_array_elements(v_questions) with ordinality
  loop
    v_value := p_responses -> v_index::text;
    insert into public.survey_answers(
      response_id, question_index, question_type, question_text,
      answer_value, answer_text, answer_options, answer_rating,
      answer_boolean, file_url
    )
    values(
      v_response_id,
      v_index,
      coalesce(v_question->>'type','short_text'),
      coalesce(v_question->>'text',''),
      v_value,
      case when jsonb_typeof(v_value)='string' then v_value #>> '{}' else null end,
      case when jsonb_typeof(v_value)='array' then v_value else null end,
      case
        when v_question->>'type'='rating' and jsonb_typeof(v_value)='number'
        then (v_value #>> '{}')::integer else null
      end,
      case
        when v_question->>'type'='yes_no' and jsonb_typeof(v_value)='boolean'
        then (v_value #>> '{}')::boolean else null
      end,
      case
        when v_question->>'type'='file_upload' and jsonb_typeof(v_value)='string'
        then v_value #>> '{}' else null
      end
    );
  end loop;

  return v_response_id;
end;
$$;
revoke all on function private.submit_survey_response(text,text,text,text,timestamptz,timestamptz,integer,jsonb) from public;
grant execute on function private.submit_survey_response(text,text,text,text,timestamptz,timestamptz,integer,jsonb)
  to anon, authenticated, service_role;

create or replace function public.submit_survey_response(
  p_survey_id text,
  p_tenant_id text,
  p_member_id text default null,
  p_member_name text default null,
  p_started_at timestamptz default now(),
  p_completed_at timestamptz default now(),
  p_time_taken_seconds integer default 0,
  p_responses jsonb default '{}'::jsonb
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.submit_survey_response(
    p_survey_id,p_tenant_id,p_member_id,p_member_name,p_started_at,
    p_completed_at,p_time_taken_seconds,p_responses
  );
$$;
revoke all on function public.submit_survey_response(text,text,text,text,timestamptz,timestamptz,integer,jsonb) from public;
grant execute on function public.submit_survey_response(text,text,text,text,timestamptz,timestamptz,integer,jsonb)
  to anon, authenticated, service_role;

create or replace function private.increment_announcement_type_usage(p_type_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.announcement_types t
  set usage_count=usage_count+1, updated_at=now()
  where t.id=p_type_id and private.can_manage_engagement_staff(t.tenant_id);
$$;
revoke all on function private.increment_announcement_type_usage(text) from public, anon;
grant execute on function private.increment_announcement_type_usage(text) to authenticated, service_role;

create or replace function public.increment_announcement_type_usage(p_type_id varchar)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.increment_announcement_type_usage(p_type_id::text);
$$;
revoke all on function public.increment_announcement_type_usage(varchar) from public, anon;
grant execute on function public.increment_announcement_type_usage(varchar) to authenticated, service_role;

create or replace function private.increment_survey_view_count(p_survey_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.surveys s
  set view_count=view_count+1
  where s.id=p_survey_id
    and private.member_can_view_survey(s.id,s.tenant_id);
$$;
revoke all on function private.increment_survey_view_count(text) from public;
grant execute on function private.increment_survey_view_count(text) to anon, authenticated, service_role;

create or replace function public.increment_survey_view_count(survey_id varchar)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.increment_survey_view_count(survey_id::text);
$$;
revoke all on function public.increment_survey_view_count(varchar) from public;
grant execute on function public.increment_survey_view_count(varchar) to anon, authenticated, service_role;
