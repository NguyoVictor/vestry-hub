-- Recovery Phase 2 (sub-batch 1B.3) - Manual testing report Finding 1.
-- Member Portal access is provisioned at member creation WITHOUT invitation,
-- activation or magic-link email. Rebased 20 Nov 2026 onto the staff handshake
-- V2 (20261120043624) as a GUARDED PATCH; supersedes the never-applied draft
-- 20261119114430, which replaced handle_new_user wholesale and bound members
-- via app_metadata (applied by GoTrue only AFTER the INSERT, so the trigger
-- never saw it and the member fell through to new-church + super_admin).
--
-- Changes:
--  1. member_login_challenges.binding_secret_hash (SHA-256 hex of a single-use
--     secret; NULL for ordinary OTP-login challenges).
--  2. handle_new_user(): the legacy member_login_challenge_id branch (trusted
--     user-editable metadata alone and OVERWROTE existing links with ON
--     CONFLICT DO UPDATE; no remaining caller) is replaced by
--     MEMBER_PORTAL_PROVISIONING_V1 (hashed secret, unconsumed, unexpired,
--     email-bound, member/tenant match, never overwrites, consumes, fails closed).
--     Staff V2 and ordinary church-onboarding signup are untouched.
--  3. One identity may link to at most one member per church.
--  4. Service-role-only helpers for the Edge Functions; tenant-admin READ of
--     portal status; registration_source 'import' allowed.
-- Rollback (trigger code only): docs/recovery/rollback/20261120_pre_p2_handle_new_user_v2.sql

ALTER TABLE public.member_login_challenges
  ADD COLUMN IF NOT EXISTS binding_secret_hash text;

DO $c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.member_login_challenges'::regclass
                    AND conname = 'member_login_challenges_binding_secret_hash_format') THEN
    ALTER TABLE public.member_login_challenges
      ADD CONSTRAINT member_login_challenges_binding_secret_hash_format
      CHECK (binding_secret_hash IS NULL OR binding_secret_hash ~ '^[0-9a-f]{64}$');
  END IF;
  IF EXISTS (SELECT 1 FROM public.member_auth_memberships
              GROUP BY auth_user_id, tenant_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Existing identity linked to several members in one church; review before Phase 2';
  END IF;
END
$c$;

CREATE UNIQUE INDEX IF NOT EXISTS member_auth_memberships_one_member_per_identity_tenant
  ON public.member_auth_memberships (auth_user_id, tenant_id);

DO $patch$
DECLARE
  source_definition text;
  decl_anchor text := '  v_pending_staff_invites integer;';
  legacy_branch text := $legacy$  begin
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
$legacy$;
  member_branch text := $branch$  -- MEMBER_PORTAL_PROVISIONING_V1: identities created server-side by
  -- member-provision-access / member-register carry a challenge id and a
  -- single-use secret in INSERT-time user metadata (GoTrue applies app_metadata
  -- and email_confirm only after the INSERT). Only the secret's SHA-256 is
  -- stored server-side, so ordinary self-signup cannot reach this branch.
  -- Never overwrites an existing link; any mismatch fails closed (no church).
  v_member_challenge_text := nullif(trim(coalesce(new.raw_user_meta_data->>'member_provisioning_challenge_id', '')), '');
  if v_member_challenge_text is not null then
    begin
      v_member_challenge_id := v_member_challenge_text::uuid;
    exception when others then
      raise exception 'Invalid member provisioning challenge.' using errcode = '28000';
    end;

    select mlc.* into v_challenge
      from public.member_login_challenges mlc
     where mlc.id = v_member_challenge_id
       and mlc.consumed_at is null
       and mlc.expires_at > v_now
       and mlc.binding_secret_hash is not null
       and mlc.binding_secret_hash = encode(sha256(convert_to(
             nullif(new.raw_user_meta_data->>'member_provisioning_secret', ''), 'UTF8')), 'hex')
       and lower(mlc.email_normalized) = lower(coalesce(new.email, ''))
     for update;

    if not found then
      raise exception 'Invalid or expired member provisioning challenge.' using errcode = '28000';
    end if;

    if not exists (
      select 1 from public.members m
       where m.id = v_challenge.member_id
         and m.tenant_id = v_challenge.tenant_id
         and lower(trim(coalesce(m.email, ''))) = lower(coalesce(new.email, ''))
    ) then
      raise exception 'Member provisioning challenge does not match the member record.' using errcode = '28000';
    end if;

    select mam.auth_user_id into v_existing_link
      from public.member_auth_memberships mam
     where mam.member_id = v_challenge.member_id
     for update;
    if found then
      raise exception 'Member is already linked to another identity.' using errcode = '28000';
    end if;

    insert into public.member_auth_memberships(auth_user_id, tenant_id, member_id)
    values (new.id, v_challenge.tenant_id, v_challenge.member_id);

    update public.member_login_challenges
       set consumed_at = v_now
     where id = v_challenge.id;

    return new;
  end if;
$branch$;
BEGIN
  source_definition := pg_get_functiondef('public.handle_new_user()'::regprocedure);
  IF source_definition IS NULL OR
     position('STAFF_INVITATION_HANDSHAKE_V2' in source_definition) = 0 THEN
    RAISE EXCEPTION 'Staff handshake V2 not present; refusing member provisioning patch';
  END IF;
  IF position('MEMBER_PORTAL_PROVISIONING_V1' in source_definition) > 0 THEN
    RAISE EXCEPTION 'Member provisioning patch already present; review migration history';
  END IF;
  IF position(legacy_branch in source_definition) = 0 OR
     position(decl_anchor in source_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected handle_new_user text; refusing member provisioning patch';
  END IF;

  source_definition := replace(source_definition, decl_anchor,
    decl_anchor || E'\n  v_member_challenge_text text;\n  v_existing_link uuid;');
  source_definition := replace(source_definition, legacy_branch, member_branch);
  EXECUTE source_definition;
END
$patch$;

-- Find an existing Auth identity by normalized email (service role only).
CREATE OR REPLACE FUNCTION public.member_portal_find_auth_user(p_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT u.id
    FROM auth.users u
   WHERE lower(u.email) = lower(trim(p_email))
     AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;
$function$;

-- Safely associate an EXISTING Auth identity with a member (service role only).
-- Never overwrites an existing association; refuses email mismatches and a
-- second member in the same tenant for the same identity.
CREATE OR REPLACE FUNCTION public.member_portal_link_existing_identity(
  p_tenant_id text, p_member_id text, p_auth_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_email text;
  v_auth_email text;
  v_linked uuid;
  v_other text;
begin
  select lower(trim(coalesce(m.email, ''))) into v_member_email
    from public.members m
   where m.id = p_member_id and m.tenant_id = p_tenant_id
   for update;
  if not found then
    return 'member_not_found';
  end if;

  select lower(u.email) into v_auth_email
    from auth.users u
   where u.id = p_auth_user_id and u.deleted_at is null;
  if v_auth_email is null or v_member_email = '' or v_auth_email <> v_member_email then
    return 'email_mismatch';
  end if;

  select mam.auth_user_id into v_linked
    from public.member_auth_memberships mam
   where mam.member_id = p_member_id;
  if found then
    if v_linked = p_auth_user_id then
      return 'already_provisioned';
    end if;
    return 'member_linked_to_other_identity';
  end if;

  select mam.member_id into v_other
    from public.member_auth_memberships mam
   where mam.auth_user_id = p_auth_user_id
     and mam.tenant_id = p_tenant_id
   limit 1;
  if found then
    return 'identity_linked_to_other_member';
  end if;

  insert into public.member_auth_memberships(auth_user_id, tenant_id, member_id)
  values (p_auth_user_id, p_tenant_id, p_member_id)
  on conflict (member_id) do nothing;

  select mam.auth_user_id into v_linked
    from public.member_auth_memberships mam
   where mam.member_id = p_member_id;
  if v_linked = p_auth_user_id then
    return 'provisioned_existing_identity';
  end if;
  return 'member_linked_to_other_identity';
end;
$function$;

-- Deploy marker checked by Edge Functions before provisioning.
CREATE OR REPLACE FUNCTION public.member_portal_provisioning_version()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT 'MEMBER_PORTAL_PROVISIONING_V1'::text $function$;

REVOKE ALL ON FUNCTION public.member_portal_find_auth_user(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.member_portal_link_existing_identity(text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.member_portal_provisioning_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_find_auth_user(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.member_portal_link_existing_identity(text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.member_portal_provisioning_version() TO service_role;

-- Read-only portal access status for active tenant administrators.
DROP POLICY IF EXISTS member_auth_memberships_tenant_admin_read ON public.member_auth_memberships;
CREATE POLICY member_auth_memberships_tenant_admin_read
  ON public.member_auth_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = (SELECT auth.uid())::text
         AND u.tenant_id = member_auth_memberships.tenant_id
         AND u.status = 'active'
         AND u.role IN ('super_admin', 'church_admin', 'admin')
    )
  );

-- Finding 1, "Imported members" path: the bulk import writes
-- registration_source = 'import', which the existing CHECK rejected, so every
-- imported row failed. Keep all existing allowed values and add 'import'.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_registration_source_check;
ALTER TABLE public.members ADD CONSTRAINT members_registration_source_check CHECK (
  registration_source = ANY (ARRAY['qr_scan'::text, 'admin'::text, 'invite_email'::text,
                                   'invite_sms'::text, 'web_form'::text, 'import'::text])
);
