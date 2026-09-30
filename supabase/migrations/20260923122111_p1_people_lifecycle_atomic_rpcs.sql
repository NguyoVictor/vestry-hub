begin;

alter table public.visitors
  add column if not exists updated_at timestamptz not null default now();

alter table public.new_converts
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists visitors_id_tenant_unique
  on public.visitors(id, tenant_id);

create unique index if not exists new_converts_tenant_visitor_unique
  on public.new_converts(tenant_id, visitor_id)
  where visitor_id is not null;

alter table public.visitors
  drop constraint if exists visitors_converted_to_member_id_fkey;

alter table public.visitors
  add constraint visitors_converted_to_member_tenant_fkey
  foreign key (converted_to_member_id, tenant_id)
  references public.members(id, tenant_id)
  on delete set null (converted_to_member_id);

alter table public.new_converts
  drop constraint if exists new_converts_visitor_id_fkey;

alter table public.new_converts
  add constraint new_converts_visitor_tenant_fkey
  foreign key (visitor_id, tenant_id)
  references public.visitors(id, tenant_id)
  on delete set null (visitor_id);

create or replace function public.convert_visitor_to_new_convert(
  p_visitor_id varchar,
  p_conversion_date date default current_date,
  p_counsellor_name varchar default null,
  p_notes text default null
)
returns varchar
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_visitor public.visitors%rowtype;
  v_convert_id varchar;
begin
  select *
    into v_visitor
  from public.visitors
  where id = p_visitor_id
  for update;

  if not found then
    raise exception 'Visitor not found.' using errcode = 'P0002';
  end if;

  if not private.can_manage_people(v_visitor.tenant_id) then
    raise exception 'Visitor conversion access denied.' using errcode = '42501';
  end if;

  select id
    into v_convert_id
  from public.new_converts
  where tenant_id = v_visitor.tenant_id
    and visitor_id = v_visitor.id
  limit 1;

  if v_convert_id is null then
    v_convert_id := gen_random_uuid()::text;

    insert into public.new_converts (
      id,
      tenant_id,
      first_name,
      last_name,
      phone,
      email,
      visitor_id,
      conversion_date,
      salvation_date,
      notes,
      counsellor_name,
      discipleship_stage,
      baptism_status,
      created_at,
      updated_at
    ) values (
      v_convert_id,
      v_visitor.tenant_id,
      v_visitor.first_name,
      coalesce(v_visitor.last_name, ''),
      v_visitor.phone,
      v_visitor.email,
      v_visitor.id,
      coalesce(p_conversion_date, current_date),
      coalesce(p_conversion_date, current_date),
      nullif(btrim(coalesce(p_notes, '')), ''),
      nullif(btrim(coalesce(p_counsellor_name, '')), ''),
      '1',
      'not_baptized',
      now(),
      now()
    );
  end if;

  update public.visitors
  set follow_up_status = 'integrated',
      updated_at = now()
  where id = v_visitor.id
    and tenant_id = v_visitor.tenant_id;

  return v_convert_id;
end;
$$;

create or replace function public.convert_visitor_to_member(
  p_visitor_id varchar
)
returns varchar
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_visitor public.visitors%rowtype;
  v_member_id varchar;
  v_membership_number varchar;
begin
  select *
    into v_visitor
  from public.visitors
  where id = p_visitor_id
  for update;

  if not found then
    raise exception 'Visitor not found.' using errcode = 'P0002';
  end if;

  if not private.can_manage_people(v_visitor.tenant_id) then
    raise exception 'Visitor conversion access denied.' using errcode = '42501';
  end if;

  if v_visitor.converted_to_member_id is not null then
    select id
      into v_member_id
    from public.members
    where id = v_visitor.converted_to_member_id
      and tenant_id = v_visitor.tenant_id;

    if v_member_id is not null then
      return v_member_id;
    end if;
  end if;

  v_member_id := gen_random_uuid()::text;
  v_membership_number := 'MEM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.members (
    id,
    tenant_id,
    first_name,
    last_name,
    email,
    phone,
    status,
    member_type,
    membership_status,
    registration_source,
    join_date,
    membership_number,
    notes,
    created_at,
    updated_at
  ) values (
    v_member_id,
    v_visitor.tenant_id,
    v_visitor.first_name,
    coalesce(v_visitor.last_name, ''),
    v_visitor.email,
    v_visitor.phone,
    'active',
    'member',
    'active',
    'visitor_conversion',
    current_date,
    v_membership_number,
    case
      when nullif(btrim(coalesce(v_visitor.notes, '')), '') is null
        then 'Converted from visitor.'
      else v_visitor.notes || E'\n\nConverted from visitor.'
    end,
    now(),
    now()
  );

  update public.visitors
  set follow_up_status = 'converted',
      converted_to_member_id = v_member_id,
      updated_at = now()
  where id = v_visitor.id
    and tenant_id = v_visitor.tenant_id;

  return v_member_id;
end;
$$;

revoke all on function public.convert_visitor_to_new_convert(varchar,date,varchar,text)
  from public, anon;
revoke all on function public.convert_visitor_to_member(varchar)
  from public, anon;

grant execute on function public.convert_visitor_to_new_convert(varchar,date,varchar,text)
  to authenticated, service_role;
grant execute on function public.convert_visitor_to_member(varchar)
  to authenticated, service_role;

commit;
