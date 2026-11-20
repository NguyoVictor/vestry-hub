-- Recovery Phase 5 — access hardening (readiness items E7, E9, E10).
-- Verified read-only on staging xwbajophstetbnnemsyq, 2026-11-20.
--
-- E7  Every admin page load sent PATCH users.last_login_at (403: blocked by
--     private.protect_user_security_fields, by design) and SignIn inserted
--     login_events from the browser (403: no grant; also spoofable — any
--     user_id, no tenant). Replace both with ONE server function that stamps
--     only the caller's own row and records a 'success' event for the caller.
--     The guard trigger gets a narrow, transaction-local allowance used only
--     by that function; every other protected field is still guarded.
-- E9  facilities_public_read_safe lets anon read every active facility row,
--     including booker_* contact columns. Keep public facility listing (public
--     booking page) but hide the booker_* columns from anon.
-- E10 asset-images / facility-images: any authenticated user (incl. other
--     churches and portal members) could upload/delete ANY path, and anon could
--     LIST all objects. Scope writes to the uploader's church folder; drop the
--     listing SELECT policies (public buckets still serve files by URL).
--
-- Rollback: docs/recovery/rollback/20261120_pre_p5_protect_user_security_fields.sql
-- (trigger code only); drop record_staff_sign_in; recreate the dropped
-- storage policies; GRANT SELECT ON public.facilities TO anon.

-- ── E7: guard allowance + sign-in stamp ─────────────────────────────────────
CREATE OR REPLACE FUNCTION private.protect_user_security_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  if (select auth.uid()) is null or private.is_platform_super_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.is_super_admin is distinct from old.is_super_admin
     or new.email is distinct from old.email
     or new.email_verified is distinct from old.email_verified
     or new.phone_verified is distinct from old.phone_verified
     or new.mfa_enabled is distinct from old.mfa_enabled
     or new.invitation_sent is distinct from old.invitation_sent then
    raise exception 'Security-sensitive user fields may only be changed by an authorized server action.' using errcode = '42501';
  end if;
  -- last_login_at: only via public.record_staff_sign_in() (sets the
  -- transaction-local flag), and only on the caller's own row.
  if new.last_login_at is distinct from old.last_login_at
     and not (coalesce(current_setting('vestry.sign_in_stamp', true), '') = 'on'
              and old.id::text = (select auth.uid())::text) then
    raise exception 'Security-sensitive user fields may only be changed by an authorized server action.' using errcode = '42501';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_staff_sign_in(p_user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_uid text := (SELECT auth.uid())::text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;
  -- Only active staff rows are stamped; members have no public.users row.
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_uid AND u.status = 'active') THEN
    RETURN;
  END IF;
  PERFORM set_config('vestry.sign_in_stamp', 'on', true);
  UPDATE public.users SET last_login_at = now() WHERE id = v_uid;
  PERFORM set_config('vestry.sign_in_stamp', 'off', true);
  INSERT INTO public.login_events (user_id, status, user_agent)
  VALUES (v_uid, 'success', left(coalesce(p_user_agent, ''), 300));
END;
$fn$;
REVOKE ALL ON FUNCTION public.record_staff_sign_in(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_staff_sign_in(text) TO authenticated;

-- ── E9: hide booker_* contact columns from anon ─────────────────────────────
REVOKE SELECT ON public.facilities FROM anon;
GRANT SELECT (id, tenant_id, name, type, capacity, description, amenities, photo_url,
              is_active, created_at, updated_at, quotation, video_path, thumbnail_path)
  ON public.facilities TO anon;

-- ── E10: tenant-folder scoping for asset-images / facility-images ───────────
DROP POLICY IF EXISTS "Authenticated users can upload asset images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete asset images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read asset images" ON storage.objects;
DROP POLICY IF EXISTS asset_images_staff_insert ON storage.objects;
CREATE POLICY asset_images_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-images'
              AND (storage.foldername(name))[1] = (public.get_my_tenant_id())::text);
DROP POLICY IF EXISTS asset_images_staff_delete ON storage.objects;
CREATE POLICY asset_images_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-images'
         AND (storage.foldername(name))[1] = (public.get_my_tenant_id())::text);

DROP POLICY IF EXISTS facility_images_upload ON storage.objects;
DROP POLICY IF EXISTS facility_images_public_read ON storage.objects;
DROP POLICY IF EXISTS facility_images_staff_insert ON storage.objects;
CREATE POLICY facility_images_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facility-images'
              AND private.can_manage_facility_bookings((storage.foldername(name))[1]));
DROP POLICY IF EXISTS facility_images_staff_delete ON storage.objects;
CREATE POLICY facility_images_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'facility-images'
         AND private.can_manage_facility_bookings((storage.foldername(name))[1]));
