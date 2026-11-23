-- T14 — branch access with personal accounts (user decision 2026-11-23:
-- "Personal accounts per branch"). Before:
--  * Settings → Branches gave each branch ONE shared username + password,
--    hashed in the browser with unsalted SHA-256, for a /branch-login page
--    that never existed.
--  * The "Branch Assignment" choice when adding / editing staff was never
--    saved (users has no branch column).
--  * Branch analytics counted members by a non-existent members.branch_id and
--    filtered giving / services / groups by tenant_id = branch id → always 0.
-- Now:
--  * staff_branch_assignments: each staff member is assigned to at most one
--    branch (none = all branches). Church admins only (can_manage_permissions);
--    validated: staff of the same church, branch of the same church.
--  * Shared branch credentials retired: cleared, and the database refuses new
--    ones (branch staff sign in with their own invited accounts).
--  * branch_overview(church): per-branch figures that are really recorded per
--    branch — assigned staff, services this month, upcoming events (members,
--    giving and groups carry no branch, so they are not shown per branch).
-- Rollback: drop the table, the trigger and the function.

CREATE TABLE IF NOT EXISTS public.staff_branch_assignments (
  user_id varchar PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id varchar NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  assigned_by varchar,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_branch_assignments_branch ON public.staff_branch_assignments (branch_id);

CREATE OR REPLACE FUNCTION private.staff_branch_assignments_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.tenant_id = NEW.tenant_id
                  AND lower(coalesce(u.role, '')) NOT IN ('member', 'guest', '')) THEN
    RAISE EXCEPTION 'Only staff of this church can be assigned to a branch.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.id = NEW.branch_id AND b.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Branch not found in this church.' USING ERRCODE = '22023';
  END IF;
  NEW.assigned_by := coalesce((SELECT auth.uid())::text, NEW.assigned_by);
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS staff_branch_assignments_validate ON public.staff_branch_assignments;
CREATE TRIGGER staff_branch_assignments_validate BEFORE INSERT OR UPDATE ON public.staff_branch_assignments
  FOR EACH ROW EXECUTE FUNCTION private.staff_branch_assignments_validate();

ALTER TABLE public.staff_branch_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sba_staff_read ON public.staff_branch_assignments;
DROP POLICY IF EXISTS sba_admin_insert ON public.staff_branch_assignments;
DROP POLICY IF EXISTS sba_admin_update ON public.staff_branch_assignments;
DROP POLICY IF EXISTS sba_admin_delete ON public.staff_branch_assignments;
CREATE POLICY sba_staff_read ON public.staff_branch_assignments FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);
CREATE POLICY sba_admin_insert ON public.staff_branch_assignments FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_permissions((tenant_id)::text));
CREATE POLICY sba_admin_update ON public.staff_branch_assignments FOR UPDATE TO authenticated
  USING (private.can_manage_permissions((tenant_id)::text)) WITH CHECK (private.can_manage_permissions((tenant_id)::text));
CREATE POLICY sba_admin_delete ON public.staff_branch_assignments FOR DELETE TO authenticated
  USING (private.can_manage_permissions((tenant_id)::text));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_branch_assignments TO authenticated;

-- ── Shared branch credentials retired ──────────────────────────────────────
UPDATE public.branches SET branch_username = NULL, branch_password_hash = NULL
 WHERE branch_username IS NOT NULL OR branch_password_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION private.branches_no_shared_credentials()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF NEW.branch_password_hash IS NOT NULL OR NEW.branch_username IS NOT NULL THEN
    RAISE EXCEPTION 'Shared branch logins were retired: branch staff sign in with their own accounts.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS branches_no_shared_credentials ON public.branches;
CREATE TRIGGER branches_no_shared_credentials BEFORE INSERT OR UPDATE OF branch_username, branch_password_hash ON public.branches
  FOR EACH ROW EXECUTE FUNCTION private.branches_no_shared_credentials();

-- ── Per-branch overview ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.branch_overview(p_tenant_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF (p_tenant_id IS NOT NULL
      AND (private.is_platform_super_admin() OR p_tenant_id = (private.get_staff_tenant_id())::text)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Only staff of this church can view its branches.' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'branch_id', b.id,
      'staff', coalesce((SELECT jsonb_agg(jsonb_build_object('id', u.id, 'name', btrim(concat_ws(' ', u.first_name, u.last_name)),
                                                             'role', u.role, 'status', u.status) ORDER BY u.first_name, u.last_name)
                           FROM public.staff_branch_assignments a JOIN public.users u ON u.id = a.user_id
                          WHERE a.branch_id = b.id AND a.tenant_id = b.tenant_id), '[]'::jsonb),
      'staff_count', (SELECT count(*) FROM public.staff_branch_assignments a WHERE a.branch_id = b.id),
      'services_this_month', (SELECT count(*) FROM public.services s WHERE s.branch_id = b.id AND s.tenant_id = b.tenant_id
                                AND s.service_date >= date_trunc('month', current_date)
                                AND s.service_date < date_trunc('month', current_date) + interval '1 month'),
      'upcoming_events', (SELECT count(*) FROM public.events e WHERE e.branch_id = b.id AND e.tenant_id = b.tenant_id
                            AND e.event_date >= current_date)
    ) ORDER BY b.name)
    FROM public.branches b WHERE b.tenant_id = p_tenant_id), '[]'::jsonb);
END $fn$;

REVOKE ALL ON FUNCTION private.staff_branch_assignments_validate(), private.branches_no_shared_credentials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.branch_overview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.branch_overview(text) TO authenticated;
