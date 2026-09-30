create or replace function private.guard_appointment_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_staff_id is not null and not exists (
    select 1
    from public.users u
    where u.id = new.assigned_staff_id
      and u.tenant_id = new.tenant_id
      and u.status = 'active'
      and length(trim(coalesce(u.role,''))) > 0
      and lower(coalesce(u.role,'')) not in ('member','guest')
  ) then
    raise exception 'Appointment assignee must be active tenant staff.' using errcode='23514';
  end if;

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

revoke select on table public.appointments from anon;
grant select (
  id, tenant_id, member_id, appointment_type_id, mode,
  preferred_date, preferred_time, notes, status, assigned_staff_id,
  location, physical_notes, jitsi_room_name, rescheduled_date,
  rescheduled_time, decline_reason, created_at, updated_at
) on table public.appointments to anon;

drop policy if exists testimonies_member_read on public.testimonies;
create policy testimonies_member_read on public.testimonies
for select to anon using (
  private.member_session_has_tenant(tenant_id)
  and (
    member_id = private.member_session_member_id(tenant_id)
    or (
      status in ('published','approved')
      and not is_anonymous
    )
  )
);

drop policy if exists testimony_reactions_member_read on public.testimony_reactions;
create policy testimony_reactions_member_read on public.testimony_reactions
for select to anon using (
  member_id = private.member_session_member_id(tenant_id)
);

create or replace function private.get_member_published_testimonies(p_tenant_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id text;
  v_result jsonb;
begin
  v_member_id := private.member_session_member_id(p_tenant_id);
  if v_member_id is null then
    raise exception 'Member session required.' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(item order by created_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      t.created_at,
      jsonb_build_object(
        'id', t.id,
        'tenant_id', t.tenant_id,
        'member_id', case when t.is_anonymous then null else t.member_id end,
        'title', t.title,
        'body', t.body,
        'category', t.category,
        'category_id', t.category_id,
        'is_anonymous', t.is_anonymous,
        'is_approved', t.is_approved,
        'approved_by', null,
        'status', t.status,
        'author_name', case when t.is_anonymous then 'Anonymous' else t.author_name end,
        'date_of_testimony', t.date_of_testimony,
        'allow_featuring', t.allow_featuring,
        'is_featured', t.is_featured,
        'view_count', t.view_count,
        'submitted_by_member_id', null,
        'submitted_by_admin_id', null,
        'testimony_date', t.testimony_date,
        'created_at', t.created_at,
        'updated_at', t.updated_at,
        'testimony_categories', case when c.id is null then null else jsonb_build_object('label', c.label, 'color', c.color) end,
        'testimony_reactions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', r.id,
            'tenant_id', r.tenant_id,
            'testimony_id', r.testimony_id,
            'member_id', case when r.member_id = v_member_id then r.member_id else null end,
            'reaction_type', r.reaction_type,
            'created_at', r.created_at
          ) order by r.created_at)
          from public.testimony_reactions r
          where r.testimony_id = t.id and r.tenant_id = t.tenant_id
        ), '[]'::jsonb),
        'members', case
          when t.is_anonymous or m.id is null then null
          else jsonb_build_object(
            'id', m.id,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'avatar_url', m.avatar_url
          )
        end
      ) as item
    from public.testimonies t
    left join public.testimony_categories c
      on c.id = t.category_id and c.tenant_id = t.tenant_id
    left join public.members m
      on m.id = t.member_id and m.tenant_id = t.tenant_id
    where t.tenant_id = p_tenant_id
      and t.status in ('published','approved')
  ) published;

  return v_result;
end;
$$;
revoke all on function private.get_member_published_testimonies(text) from public;
grant execute on function private.get_member_published_testimonies(text) to anon, authenticated, service_role;

create or replace function public.get_member_published_testimonies(p_tenant_id text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_member_published_testimonies(p_tenant_id);
$$;
revoke all on function public.get_member_published_testimonies(text) from public;
grant execute on function public.get_member_published_testimonies(text) to anon, authenticated, service_role;
