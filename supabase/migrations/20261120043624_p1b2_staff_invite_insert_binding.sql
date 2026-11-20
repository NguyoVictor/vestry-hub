-- Phase 1B.2 follow-up: STAFF_INVITATION_HANDSHAKE_V2
--
-- Root cause (verified against supabase/auth source, internal/api/invite.go +
-- mail.go): inviteUserByEmail INSERTs auth.users with invited_at = NULL and only
-- sets invited_at afterwards in sendInvite() via
-- tx.UpdateOnly(u, "confirmation_token", "confirmation_sent_at", "invited_at").
-- The AFTER INSERT trigger patched by 20261119101722 therefore always saw
-- invited_at IS NULL and raised "Pending staff invitation must be accepted
-- through Auth invite" for EVERY real invitation (fail closed, no data harm).
--
-- Fix: the only caller-controlled data GoTrue writes AT INSERT time is the
-- invite `data` (raw_user_meta_data, via SignupParams.ToUserModel ->
-- models.NewUser). The service-role send-invitation function now generates a
-- 256-bit single-use secret, stores only its SHA-256 on the trusted
-- staff_invitations row, and passes the secret in invite data. The trigger
-- binds the identity to the pending invitation only when the hash matches.
-- Tenant and role still come exclusively from the server-written row; an
-- ordinary self-signup cannot guess the secret and still fails closed.
--
-- Guarded patch: refuses to run unless the live trigger is exactly the V1
-- handshake; never re-applies. Rollback = re-apply 20261119101722's V1 body
-- (docs/recovery/rollback/) together with send-invitation v3.

ALTER TABLE public.staff_invitations
  ADD COLUMN IF NOT EXISTS binding_nonce_hash text;

DO $c$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.staff_invitations'::regclass
       AND conname = 'staff_invitations_binding_nonce_hash_format'
  ) THEN
    ALTER TABLE public.staff_invitations
      ADD CONSTRAINT staff_invitations_binding_nonce_hash_format
      CHECK (binding_nonce_hash IS NULL OR binding_nonce_hash ~ '^[0-9a-f]{64}$');
  END IF;
END
$c$;

DO $patch$
DECLARE
  source_definition text;
  old_gate text := $old$    if v_pending_staff_invites = 1 and new.invited_at is null then
      raise exception 'Pending staff invitation must be accepted through Auth invite.'
        using errcode = '28000';
    end if;$old$;
  new_gate text := $new$    -- STAFF_INVITATION_HANDSHAKE_V2: GoTrue sets invited_at only AFTER the
    -- INSERT, so bind via the single-use secret the service-role caller put in
    -- insert-time user metadata. Only its SHA-256 is stored server-side.
    if v_pending_staff_invites = 1 and not exists (
      select 1
        from public.staff_invitations si
       where lower(si.email) = lower(coalesce(new.email, ''))
         and si.consumed_at is null
         and si.expires_at > v_now
         and si.binding_nonce_hash is not null
         and si.binding_nonce_hash = encode(sha256(convert_to(
               nullif(new.raw_user_meta_data->>'staff_invitation_nonce', ''), 'UTF8')), 'hex')
    ) then
      raise exception 'Pending staff invitation must be accepted through the bound Auth invite.'
        using errcode = '28000';
    end if;
    -- A bound invite whose row is missing/expired/consumed must never fall
    -- through to the new-church branch below.
    if v_pending_staff_invites = 0 and
       nullif(new.raw_user_meta_data->>'staff_invitation_nonce', '') is not null then
      raise exception 'Auth invitation is not bound to an approved staff/member invitation.'
        using errcode = '28000';
    end if;$new$;
BEGIN
  source_definition := pg_get_functiondef('public.handle_new_user()'::regprocedure);
  IF source_definition IS NULL OR
     position('STAFF_INVITATION_HANDSHAKE_V1' in source_definition) = 0 THEN
    RAISE EXCEPTION 'V1 staff invitation handshake not present; refusing V2 patch';
  END IF;
  IF position('STAFF_INVITATION_HANDSHAKE_V2' in source_definition) > 0 THEN
    RAISE EXCEPTION 'Staff invitation handshake V2 already present; review migration history';
  END IF;
  IF position(old_gate in source_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected V1 invited_at gate text; refusing V2 patch';
  END IF;

  EXECUTE replace(source_definition, old_gate, new_gate);
END
$patch$;

-- Version 2 tells send-invitation the insert-time binding is installed.
CREATE OR REPLACE FUNCTION public.staff_invitation_handshake_version()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$ SELECT 2 $fn$;

REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM anon;
REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.staff_invitation_handshake_version() TO service_role;
