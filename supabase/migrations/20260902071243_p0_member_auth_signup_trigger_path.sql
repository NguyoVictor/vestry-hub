create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id varchar;
  v_church_code varchar;
  v_full_name text;
  v_first_name varchar;
  v_last_name varchar;
  v_now timestamptz;
  v_invitation_id varchar;
  v_member_challenge_id uuid;
  v_invitation public.staff_invitations%rowtype;
  v_challenge public.member_login_challenges%rowtype;
begin
  if exists (select 1 from public.users where id = new.id::text) then
    return new;
  end if;

  v_now := now();
  v_invitation_id := nullif(trim(coalesce(new.raw_app_meta_data->>'staff_invitation_id', '')), '');

  begin
    v_member_challenge_id := nullif(trim(coalesce(new.raw_user_meta_data->>'member_login_challenge_id', '')), '')::uuid;
  exception when others then
    v_member_challenge_id := null;
  end;

  if v_member_challenge_id is not null then
    select mlc.* into v_challenge
    from public.member_login_challenges mlc
    where mlc.id = v_member_challenge_id
      and lower(mlc.email_normalized) = lower(coalesce(new.email, ''))
      and mlc.expires_at > v_now
    limit 1;

    if found then
      insert into public.member_auth_memberships(auth_user_id, tenant_id, member_id)
      values (new.id, v_challenge.tenant_id, v_challenge.member_id)
      on conflict (member_id) do update
        set auth_user_id = excluded.auth_user_id,
            tenant_id = excluded.tenant_id,
            last_used_at = now();
      return new;
    end if;
  end if;

  if v_invitation_id is not null then
    select si.* into v_invitation
    from public.staff_invitations si
    where si.id = v_invitation_id
      and lower(si.email) = lower(coalesce(new.email, ''))
      and si.consumed_at is null
      and si.expires_at > v_now
    limit 1 for update;

    if not found then
      raise exception 'Invalid or expired staff invitation.' using errcode = '28000';
    end if;

    update public.staff_invitations
      set consumed_at = v_now, auth_user_id = new.id::text
    where id = v_invitation.id;

    insert into public.users (
      id, tenant_id, email, first_name, last_name, role, status, is_super_admin,
      avatar_url, join_date, created_at, updated_at, email_verified, invitation_sent
    ) values (
      new.id::text, v_invitation.tenant_id, coalesce(new.email, v_invitation.email),
      coalesce(nullif(v_invitation.first_name, ''), 'Staff'),
      coalesce(nullif(v_invitation.last_name, ''), 'User'),
      v_invitation.role, 'active', false,
      coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
      v_now::date, v_now, v_now, new.email_confirmed_at is not null, true
    );
    return new;
  end if;

  v_tenant_id := gen_random_uuid()::text;
  v_church_code := upper(substring(md5(random()::text) from 1 for 4) || substring(md5(random()::text) from 1 for 4));
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_first_name := coalesce(new.raw_user_meta_data->>'given_name', nullif(split_part(v_full_name, ' ', 1), ''), 'Admin');
  v_last_name := coalesce(new.raw_user_meta_data->>'family_name', nullif(trim(substring(v_full_name from position(' ' in v_full_name) + 1)), ''), 'User');

  insert into public.tenants (
    id, slug, name, church_code, subscription_plan, subscription_tier, subscription_status,
    onboarding_completed, onboarding_step, created_at, updated_at
  ) values (
    v_tenant_id, lower(v_church_code), v_first_name || '''s Church', v_church_code,
    'free', 'free', 'trial', false, 0, v_now, v_now
  );

  insert into public.users (
    id, tenant_id, email, first_name, last_name, role, status, is_super_admin,
    avatar_url, join_date, created_at, updated_at, email_verified
  ) values (
    new.id::text, v_tenant_id, coalesce(new.email, ''), v_first_name, v_last_name,
    'super_admin', 'active', false,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    v_now::date, v_now, v_now, new.email_confirmed_at is not null
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;;
