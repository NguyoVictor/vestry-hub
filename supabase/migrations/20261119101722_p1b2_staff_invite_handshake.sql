DO $patch$
DECLARE
  source_definition text;
  expected_declaration text := '  v_challenge public.member_login_challenges%rowtype;';
  expected_branch text := '  if v_invitation_id is not null then';
BEGIN
  source_definition := pg_get_functiondef('public.handle_new_user()'::regprocedure);
  IF source_definition IS NULL OR
     position('v_invitation_id := nullif(trim(coalesce(new.raw_app_meta_data' in source_definition) = 0 OR
     position('v_member_challenge_id' in source_definition) = 0 OR
     position('v_tenant_id := gen_random_uuid()::text;' in source_definition) = 0 OR
     position(expected_declaration in source_definition) = 0 OR
     position(expected_branch in source_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected Auth signup trigger; do not apply staff invitation patch';
  END IF;
  IF position('STAFF_INVITATION_HANDSHAKE_V1' in source_definition) > 0 THEN
    RAISE EXCEPTION 'Staff invitation handshake already present; review migration history';
  END IF;

  source_definition := replace(
    source_definition, expected_declaration,
    expected_declaration || E'\n  v_pending_staff_invites integer;'
  );

  -- The trusted DB row, not user_metadata, supplies tenant and role. Only
  -- Auth invitation flows (new.invited_at IS NOT NULL) can claim the row.
  -- Any ambiguous or unbacked invitation fails closed, including the OLD
  -- Edge Function flow that did not create a staff_invitations record.
  source_definition := replace(source_definition, expected_branch, $branch$
  -- STAFF_INVITATION_HANDSHAKE_V1: Fail closed for unbound Auth invitations.
  if v_invitation_id is null then
    select count(*) into v_pending_staff_invites
      from public.staff_invitations si
     where lower(si.email) = lower(coalesce(new.email, ''))
       and si.consumed_at is null
       and si.expires_at > v_now;

    if v_pending_staff_invites > 1 then
      raise exception 'Multiple pending staff invitations require administrator review.'
        using errcode = '28000';
    end if;
    if v_pending_staff_invites = 1 and new.invited_at is null then
      raise exception 'Pending staff invitation must be accepted through Auth invite.'
        using errcode = '28000';
    end if;
    if new.invited_at is not null and v_pending_staff_invites = 0 then
      raise exception 'Auth invitation is not bound to an approved staff/member invitation.'
        using errcode = '28000';
    end if;
    if v_pending_staff_invites = 1 then
      select si.id into v_invitation_id
        from public.staff_invitations si
       where lower(si.email) = lower(new.email)
         and si.consumed_at is null
         and si.expires_at > v_now
       for update;
    end if;
  end if;

  if v_invitation_id is not null then$branch$);

  -- CREATE OR REPLACE preserves the existing function identity/owner and
  -- leaves all member-challenge and new-church branches otherwise unchanged.
  EXECUTE source_definition;
END
$patch$;

CREATE OR REPLACE FUNCTION public.staff_invitation_handshake_version()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$ SELECT 1 $fn$;

REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM anon;
REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.staff_invitation_handshake_version() TO service_role;