-- T5 + T16 — custom roles (permission templates) and several roles per person
-- (pre-production scope; product rules from the user 2026-11-23):
--  * One person may hold several roles in a church. Effective access per area
--    = the MOST GENEROUS level among their custom roles that set that area.
--  * A custom role is a permission template: per area full_access /
--    read_only / none.
--  * Only church admins (super_admin / church_admin role — the existing
--    private.can_manage_permissions rule) create custom roles or assign roles.
-- Before: the Users page read/wrote public.custom_roles, which did not exist
-- (404); a custom role had no effect on access.
--
-- Effective level for (person, area):
--   1. per-person override in user_fine_permissions (level ≠ 'default') wins;
--   2. else most generous among the active custom roles assigned to them in
--      staff_role_assignments (a custom role cannot be the main role: the
--      users_role_check constraint allows built-in roles only);
--   3. else 'default' (today's behaviour).
-- private.can_write_permission (behind ~125 policies) now honours this:
-- read_only and none both block writes. Church admins keep full access.
-- "none" is additionally enforced in the app (page shows no access); the
-- database still lets staff READ an area's data (unchanged) — see backlog.
-- Additional roles cannot be admin roles (elevation stays with the main role
-- and the update-user-role rules).
-- Rollback: restore can_write_permission from 20261120140000; drop the two
-- tables and three functions below.

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  description text CHECK (description IS NULL OR length(description) <= 300),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS custom_roles_tenant_name_key ON public.custom_roles (tenant_id, lower(btrim(name))) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text,
  custom_role_id varchar REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_role_assignments_one_kind CHECK ((role IS NULL) <> (custom_role_id IS NULL)),
  CONSTRAINT staff_role_assignments_not_elevated CHECK (role IS NULL OR lower(role) NOT IN ('super_admin', 'church_admin', 'member', 'guest'))
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_role_assignments_unique
  ON public.staff_role_assignments (tenant_id, user_id, coalesce(lower(role), ''), coalesce(custom_role_id, ''));
CREATE INDEX IF NOT EXISTS staff_role_assignments_user ON public.staff_role_assignments (user_id, tenant_id);

-- ── Validation ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.custom_roles_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE k text; v text;
BEGIN
  IF jsonb_typeof(NEW.permissions) <> 'object' THEN
    RAISE EXCEPTION 'Role permissions must be an object.' USING ERRCODE = '22023';
  END IF;
  FOR k, v IN SELECT key, value #>> '{}' FROM jsonb_each(NEW.permissions) LOOP
    IF k NOT IN ('member_management','financial_records','event_management','communication_tools',
                 'reports_analytics','attendance','groups_ministries','church_settings') THEN
      RAISE EXCEPTION 'Unknown permission area: %', k USING ERRCODE = '22023';
    END IF;
    IF v NOT IN ('full_access','read_only','none') THEN
      RAISE EXCEPTION 'Level for % must be full_access, read_only or none.', k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF lower(btrim(NEW.name)) IN ('super_admin','church_admin','member','guest','general_overseer','senior_pastor',
                                'pastor','assistant_pastor','accountant','leader','studio_operator','staff','volunteer',
                                'church admin','super admin') THEN
    RAISE EXCEPTION 'That name is reserved for a built-in role.' USING ERRCODE = '22023';
  END IF;
  NEW.name := btrim(NEW.name);
  NEW.updated_at := now();
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS custom_roles_validate ON public.custom_roles;
CREATE TRIGGER custom_roles_validate BEFORE INSERT OR UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION private.custom_roles_validate();

CREATE OR REPLACE FUNCTION private.staff_role_assignments_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.tenant_id = NEW.tenant_id
                  AND lower(coalesce(u.role, '')) NOT IN ('member', 'guest', '')) THEN
    RAISE EXCEPTION 'Roles can only be given to staff of this church.' USING ERRCODE = '22023';
  END IF;
  IF NEW.custom_role_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.custom_roles r WHERE r.id = NEW.custom_role_id AND r.tenant_id = NEW.tenant_id AND r.is_active) THEN
    RAISE EXCEPTION 'Custom role not found in this church.' USING ERRCODE = '22023';
  END IF;
  NEW.assigned_by := coalesce((SELECT auth.uid())::text, NEW.assigned_by);
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS staff_role_assignments_validate ON public.staff_role_assignments;
CREATE TRIGGER staff_role_assignments_validate BEFORE INSERT OR UPDATE ON public.staff_role_assignments
  FOR EACH ROW EXECUTE FUNCTION private.staff_role_assignments_validate();

-- ── RLS: staff of the church read; only church admins write ────────────────
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_roles_staff_read ON public.custom_roles;
DROP POLICY IF EXISTS custom_roles_admin_insert ON public.custom_roles;
DROP POLICY IF EXISTS custom_roles_admin_update ON public.custom_roles;
DROP POLICY IF EXISTS custom_roles_admin_delete ON public.custom_roles;
CREATE POLICY custom_roles_staff_read ON public.custom_roles FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);
CREATE POLICY custom_roles_admin_insert ON public.custom_roles FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_permissions((tenant_id)::text));
CREATE POLICY custom_roles_admin_update ON public.custom_roles FOR UPDATE TO authenticated
  USING (private.can_manage_permissions((tenant_id)::text)) WITH CHECK (private.can_manage_permissions((tenant_id)::text));
CREATE POLICY custom_roles_admin_delete ON public.custom_roles FOR DELETE TO authenticated
  USING (private.can_manage_permissions((tenant_id)::text));

DROP POLICY IF EXISTS sra_staff_read ON public.staff_role_assignments;
DROP POLICY IF EXISTS sra_admin_insert ON public.staff_role_assignments;
DROP POLICY IF EXISTS sra_admin_delete ON public.staff_role_assignments;
CREATE POLICY sra_staff_read ON public.staff_role_assignments FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);
CREATE POLICY sra_admin_insert ON public.staff_role_assignments FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_permissions((tenant_id)::text));
CREATE POLICY sra_admin_delete ON public.staff_role_assignments FOR DELETE TO authenticated
  USING (private.can_manage_permissions((tenant_id)::text));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.staff_role_assignments TO authenticated;

-- ── Effective level ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.effective_permission_level(p_user_id text, p_tenant_id text, p_permission_key text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT coalesce(
    -- 1. per-person override
    (SELECT ufp.level FROM public.user_fine_permissions ufp
      WHERE ufp.user_id = p_user_id AND ufp.tenant_id = p_tenant_id AND ufp.permission_key = p_permission_key
        AND ufp.level <> 'default' LIMIT 1),
    -- 2. most generous among the person's active custom roles that set this area
    (SELECT CASE max(CASE r.permissions ->> p_permission_key WHEN 'full_access' THEN 3 WHEN 'read_only' THEN 2 WHEN 'none' THEN 1 END)
              WHEN 3 THEN 'full_access' WHEN 2 THEN 'read_only' WHEN 1 THEN 'none' END
       FROM public.custom_roles r
      WHERE r.tenant_id = p_tenant_id AND r.is_active AND r.permissions ? p_permission_key
        AND EXISTS (SELECT 1 FROM public.staff_role_assignments a
                     WHERE a.custom_role_id = r.id AND a.user_id = p_user_id AND a.tenant_id = p_tenant_id)),
    'default');
$fn$;

CREATE OR REPLACE FUNCTION private.can_write_permission(p_tenant_id text, p_permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT private.is_platform_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.users u
         WHERE u.id = (SELECT auth.uid())::text
           AND u.tenant_id = p_tenant_id
           AND u.status = 'active'
           AND (lower(coalesce(u.role, '')) IN ('super_admin', 'church_admin')
                OR private.effective_permission_level(u.id, p_tenant_id, p_permission_key) NOT IN ('read_only', 'none')));
$fn$;

-- The signed-in staff member's own effective levels (for the app).
CREATE OR REPLACE FUNCTION public.my_permission_levels(p_tenant_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE u public.users; v_levels jsonb := '{}'::jsonb; k text; v_admin boolean;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = (SELECT auth.uid())::text AND tenant_id = p_tenant_id AND status = 'active';
  IF u.id IS NULL THEN RETURN jsonb_build_object('is_admin', false, 'levels', '{}'::jsonb, 'roles', '[]'::jsonb); END IF;
  v_admin := lower(coalesce(u.role, '')) IN ('super_admin', 'church_admin') OR private.is_platform_super_admin();
  FOREACH k IN ARRAY ARRAY['member_management','financial_records','event_management','communication_tools',
                           'reports_analytics','attendance','groups_ministries','church_settings'] LOOP
    v_levels := v_levels || jsonb_build_object(k, CASE WHEN v_admin THEN 'full_access'
                                                       ELSE private.effective_permission_level(u.id, p_tenant_id, k) END);
  END LOOP;
  RETURN jsonb_build_object('is_admin', v_admin, 'levels', v_levels,
    'roles', coalesce((SELECT jsonb_agg(coalesce(a.role, r.name) ORDER BY coalesce(a.role, r.name))
                         FROM public.staff_role_assignments a LEFT JOIN public.custom_roles r ON r.id = a.custom_role_id
                        WHERE a.user_id = u.id AND a.tenant_id = p_tenant_id AND (a.role IS NOT NULL OR r.is_active)), '[]'::jsonb));
END $fn$;

REVOKE ALL ON FUNCTION private.custom_roles_validate(), private.staff_role_assignments_validate(),
  private.effective_permission_level(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_permission_levels(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_permission_levels(text) TO authenticated;
