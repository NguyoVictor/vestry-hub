-- Recovery Phase 6 — Finding 8: Security Alerts were static.
-- Verified on staging 2026-11-20: SecurityCentre reads public.security_alerts
-- (0 rows) but NOTHING writes it server-side (the only writer was browser
-- code on the sign-in page that could never work and was removed in Phase 5).
-- Also: any staff member could INSERT fake alerts or DELETE real ones
-- (FOR ALL tenant policies), defeating the audit trail.
--
-- This migration makes alerts real, server-generated events:
--   * failed staff sign-ins (public.report_failed_sign_in, rate-limited,
--     never reveals whether an account exists) → login_events 'failed' +
--     'failed_login' (low, first failure per 10 min) and 'brute_force_attempt'
--     (high, at the 3rd failure within 10 min, once per window)
--   * role changes / administrator grants / deactivation / reactivation of
--     staff users (trigger on public.users)
--   * new staff invitations (trigger on public.staff_invitations)
-- Browser: read (church staff), resolve (reports_analytics write permission);
-- no browser INSERT/DELETE. Idempotent. Rollback: drop the functions/triggers
-- and policies below and recreate security_alerts_tenant_rls (not advised).

CREATE INDEX IF NOT EXISTS idx_login_events_user_created ON public.login_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_created ON public.security_alerts (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.raise_security_alert(
  p_tenant_id text, p_severity text, p_type text, p_description text,
  p_user_id text DEFAULT NULL, p_user_name text DEFAULT NULL, p_raw jsonb DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $fn$
  INSERT INTO public.security_alerts
    (id, tenant_id, severity, alert_type, description, affected_user_id, affected_user_name, raw_data, status, created_at, updated_at)
  SELECT gen_random_uuid()::text, p_tenant_id, p_severity, p_type, p_description,
         p_user_id, p_user_name, p_raw, 'open', now(), now()
  WHERE p_tenant_id IS NOT NULL;
$fn$;
REVOKE ALL ON FUNCTION private.raise_security_alert(text, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Called by the sign-in page after a failed password sign-in. Returns nothing
-- either way (no account enumeration). Unknown emails are ignored.
CREATE OR REPLACE FUNCTION public.report_failed_sign_in(p_email text, p_user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  u record;
  recent int;
BEGIN
  IF p_email IS NULL OR length(p_email) > 320 THEN RETURN; END IF;
  SELECT id, tenant_id, email, first_name, last_name INTO u
    FROM public.users
   WHERE lower(email) = lower(btrim(p_email)) AND status = 'active'
   ORDER BY created_at NULLS LAST LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO recent FROM public.login_events
   WHERE user_id = u.id AND status = 'failed' AND created_at > now() - interval '10 minutes';
  IF recent >= 50 THEN RETURN; END IF;   -- flood guard: stop recording

  INSERT INTO public.login_events (user_id, status, user_agent)
  VALUES (u.id, 'failed', left(coalesce(p_user_agent, ''), 300));

  IF recent = 0 THEN
    PERFORM private.raise_security_alert(u.tenant_id, 'low', 'failed_login',
      'Failed sign-in attempt', u.id, coalesce(nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email));
  ELSIF recent = 2 THEN
    PERFORM private.raise_security_alert(u.tenant_id, 'high', 'brute_force_attempt',
      'Multiple failed sign-in attempts (3 within 10 minutes)', u.id,
      coalesce(nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email));
  END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION public.report_failed_sign_in(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_failed_sign_in(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.users_security_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  who text := coalesce(nullif(btrim(concat_ws(' ', NEW.first_name, NEW.last_name)), ''), NEW.email);
  raw jsonb := jsonb_build_object('changed_by', (SELECT auth.uid())::text,
                                  'old_role', OLD.role, 'new_role', NEW.role,
                                  'old_status', OLD.status, 'new_status', NEW.status);
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF lower(coalesce(NEW.role, '')) IN ('super_admin', 'church_admin') THEN
      PERFORM private.raise_security_alert(NEW.tenant_id, 'high', 'admin_role_granted',
        format('Administrator role granted: %s → %s', coalesce(OLD.role, '—'), NEW.role), NEW.id, who, raw);
    ELSE
      PERFORM private.raise_security_alert(NEW.tenant_id, 'medium', 'role_changed',
        format('Role changed: %s → %s', coalesce(OLD.role, '—'), coalesce(NEW.role, '—')), NEW.id, who, raw);
    END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.raise_security_alert(NEW.tenant_id, 'medium',
      CASE WHEN NEW.status = 'inactive' THEN 'user_deactivated' ELSE 'user_status_changed' END,
      format('Account status changed: %s → %s', coalesce(OLD.status, '—'), coalesce(NEW.status, '—')), NEW.id, who, raw);
  END IF;
  RETURN NULL;
END;
$fn$;
REVOKE ALL ON FUNCTION private.users_security_alerts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS users_security_alerts ON public.users;
CREATE TRIGGER users_security_alerts AFTER UPDATE OF role, status ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.users_security_alerts();

CREATE OR REPLACE FUNCTION private.staff_invitation_security_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  PERFORM private.raise_security_alert(NEW.tenant_id::text,
    CASE WHEN lower(coalesce(NEW.role, '')) IN ('super_admin', 'church_admin') THEN 'high' ELSE 'low' END,
    'staff_invited', format('Staff invitation sent (%s)', coalesce(NEW.role, 'staff')), NULL, NEW.email,
    jsonb_build_object('invited_by', (SELECT auth.uid())::text));
  RETURN NULL;
END;
$fn$;
REVOKE ALL ON FUNCTION private.staff_invitation_security_alert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS staff_invitation_security_alert ON public.staff_invitations;
CREATE TRIGGER staff_invitation_security_alert AFTER INSERT ON public.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION private.staff_invitation_security_alert();

-- Browser access: read for church staff; resolve with reports_analytics
-- write permission; no browser INSERT/DELETE (alerts are server-generated).
DROP POLICY IF EXISTS security_alerts_tenant_rls ON public.security_alerts;
DROP POLICY IF EXISTS tenant_isolation ON public.security_alerts;
DROP POLICY IF EXISTS security_alerts_p6_read ON public.security_alerts;
DROP POLICY IF EXISTS security_alerts_p6_resolve ON public.security_alerts;
CREATE POLICY security_alerts_p6_read ON public.security_alerts FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);
CREATE POLICY security_alerts_p6_resolve ON public.security_alerts FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'reports_analytics'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'reports_analytics'));
