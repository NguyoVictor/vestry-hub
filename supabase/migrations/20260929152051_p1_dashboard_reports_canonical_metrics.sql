
create or replace function private.can_read_analytics(p_tenant_id text)
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
        and length(trim(coalesce(u.role,''))) > 0
        and lower(coalesce(u.role,'')) not in ('member','guest')
    );
$$;

revoke all on function private.can_read_analytics(text) from public, anon;
grant execute on function private.can_read_analytics(text) to authenticated, service_role;

create or replace function private.get_canonical_analytics_metrics(
  p_tenant_id text,
  p_from_date date,
  p_to_date date,
  p_as_of_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_active_members integer := 0;
  v_active_groups integer := 0;
  v_new_members integer := 0;
  v_confirmed_giving numeric := 0;
  v_approved_expenses numeric := 0;
  v_published_events integer := 0;
  v_attendance_total integer := 0;
  v_visitors integer := 0;
  v_converted_visitors integer := 0;
  v_volunteer_assignments integer := 0;
  v_volunteer_hours numeric := 0;
  v_announcement_reactions integer := 0;
  v_announcement_comments integer := 0;
  v_announcement_reads integer := 0;
  v_survey_responses integer := 0;
  v_completed_appointments integer := 0;
  v_published_testimonies integer := 0;
  v_giving_today numeric := 0;
  v_giving_current_month numeric := 0;
  v_upcoming_events_7d integer := 0;
begin
  if p_tenant_id is null or p_from_date is null or p_to_date is null or p_as_of_date is null then
    raise exception 'Analytics tenant and dates are required.' using errcode='22004';
  end if;

  if p_from_date > p_to_date then
    raise exception 'Analytics start date must not be after end date.' using errcode='22007';
  end if;

  if not private.can_read_analytics(p_tenant_id) then
    raise exception 'Analytics access denied.' using errcode='42501';
  end if;

  select count(*) into v_active_members
  from public.members
  where tenant_id = p_tenant_id
    and status = 'active';

  select count(*) into v_active_groups
  from public.groups
  where tenant_id = p_tenant_id
    and is_active = true;

  select count(*) into v_new_members
  from public.members
  where tenant_id = p_tenant_id
    and created_at::date between p_from_date and p_to_date;

  select coalesce(sum(amount),0) into v_confirmed_giving
  from public.giving_records
  where tenant_id = p_tenant_id
    and payment_status::text = 'confirmed'
    and voided_at is null
    and given_at between p_from_date and p_to_date;

  select coalesce(sum(amount),0) into v_approved_expenses
  from public.expenses
  where tenant_id = p_tenant_id
    and approval_status = 'approved'
    and expense_date between p_from_date and p_to_date;

  select count(*) into v_published_events
  from public.events
  where tenant_id = p_tenant_id
    and is_published = true
    and event_date between p_from_date and p_to_date;

  select count(*) into v_attendance_total
  from public.service_attendance sa
  join public.services s
    on s.id = sa.service_id
   and s.tenant_id = sa.tenant_id
  where sa.tenant_id = p_tenant_id
    and s.service_date between p_from_date and p_to_date
    and lower(coalesce(sa.status,'present')) in ('present','attending','late');

  select count(*) into v_visitors
  from public.visitors
  where tenant_id = p_tenant_id
    and visit_date between p_from_date and p_to_date;

  select count(*) into v_converted_visitors
  from public.visitors
  where tenant_id = p_tenant_id
    and visit_date between p_from_date and p_to_date
    and (
      converted_to_member_id is not null
      or lower(coalesce(follow_up_status,'')) = 'converted'
    );

  select count(*) into v_volunteer_assignments
  from public.volunteers
  where tenant_id = p_tenant_id
    and status = 'confirmed'
    and created_at::date between p_from_date and p_to_date;

  select coalesce(sum(hours),0) into v_volunteer_hours
  from public.volunteer_hours
  where tenant_id = p_tenant_id
    and logged_date between p_from_date and p_to_date;

  select count(*) into v_announcement_reactions
  from public.announcement_reactions
  where tenant_id = p_tenant_id
    and created_at::date between p_from_date and p_to_date;

  select count(*) into v_announcement_comments
  from public.announcement_comments
  where tenant_id = p_tenant_id
    and coalesce(is_deleted,false) = false
    and created_at::date between p_from_date and p_to_date;

  select count(*) into v_announcement_reads
  from public.announcement_read_receipts
  where tenant_id = p_tenant_id
    and read_at::date between p_from_date and p_to_date;

  select count(*) into v_survey_responses
  from public.survey_responses
  where tenant_id = p_tenant_id
    and coalesce(is_complete,false) = true
    and coalesce(completed_at,submitted_at)::date between p_from_date and p_to_date;

  select count(*) into v_completed_appointments
  from public.appointments
  where tenant_id = p_tenant_id
    and status = 'completed'
    and updated_at::date between p_from_date and p_to_date;

  select count(*) into v_published_testimonies
  from public.testimonies
  where tenant_id = p_tenant_id
    and status in ('published','approved')
    and coalesce(testimony_date,date_of_testimony,created_at::date) between p_from_date and p_to_date;

  select coalesce(sum(amount),0) into v_giving_today
  from public.giving_records
  where tenant_id = p_tenant_id
    and payment_status::text = 'confirmed'
    and voided_at is null
    and given_at = p_as_of_date;

  select coalesce(sum(amount),0) into v_giving_current_month
  from public.giving_records
  where tenant_id = p_tenant_id
    and payment_status::text = 'confirmed'
    and voided_at is null
    and given_at between date_trunc('month',p_as_of_date)::date and p_as_of_date;

  select count(*) into v_upcoming_events_7d
  from public.events
  where tenant_id = p_tenant_id
    and is_published = true
    and event_date between p_as_of_date and (p_as_of_date + 6);

  return jsonb_build_object(
    'snapshot', jsonb_build_object(
      'active_members', v_active_members,
      'active_groups', v_active_groups
    ),
    'range', jsonb_build_object(
      'from', p_from_date,
      'to', p_to_date,
      'new_members', v_new_members,
      'confirmed_giving', v_confirmed_giving,
      'approved_expenses', v_approved_expenses,
      'net_surplus', v_confirmed_giving - v_approved_expenses,
      'published_events', v_published_events,
      'attendance_total', v_attendance_total,
      'visitors', v_visitors,
      'converted_visitors', v_converted_visitors,
      'visitor_conversion_rate', case when v_visitors > 0
        then round((v_converted_visitors::numeric / v_visitors::numeric) * 100, 1)
        else 0 end,
      'volunteer_assignments', v_volunteer_assignments,
      'volunteer_hours', v_volunteer_hours,
      'engagement_actions',
        v_announcement_reactions + v_announcement_comments + v_announcement_reads
        + v_survey_responses + v_completed_appointments + v_published_testimonies,
      'engagement', jsonb_build_object(
        'announcement_reactions', v_announcement_reactions,
        'announcement_comments', v_announcement_comments,
        'announcement_reads', v_announcement_reads,
        'survey_responses', v_survey_responses,
        'completed_appointments', v_completed_appointments,
        'published_testimonies', v_published_testimonies
      )
    ),
    'dashboard', jsonb_build_object(
      'as_of', p_as_of_date,
      'giving_today', v_giving_today,
      'giving_current_month', v_giving_current_month,
      'upcoming_events_7d', v_upcoming_events_7d
    )
  );
end;
$$;

revoke all on function private.get_canonical_analytics_metrics(text,date,date,date) from public, anon;
grant execute on function private.get_canonical_analytics_metrics(text,date,date,date) to authenticated, service_role;

create or replace function public.get_canonical_analytics_metrics(
  p_tenant_id text,
  p_from_date date,
  p_to_date date,
  p_as_of_date date default current_date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_canonical_analytics_metrics(
    p_tenant_id,p_from_date,p_to_date,p_as_of_date
  );
$$;

revoke all on function public.get_canonical_analytics_metrics(text,date,date,date) from public, anon;
grant execute on function public.get_canonical_analytics_metrics(text,date,date,date) to authenticated, service_role;
