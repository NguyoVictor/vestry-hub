-- Recovery Phase 5 — E11: align backend write rules with the frontend gates.
-- IncidentManagement.tsx and AssetManagement.tsx gate writes on
-- isReadOnly('reports_analytics'), but incidents / church_assets /
-- asset_maintenance allowed ANY active staff of the church to write (single
-- FOR ALL tenant policy), so a staff member set read-only in the app could
-- still write through the API. Reads stay "staff of this church"; writes now
-- require private.can_write_permission(<church>, 'reports_analytics') — the
-- same key the pages use (asset_release_requests already uses it, 20261120140000).
-- incident_status_logs inserts follow the incident write rule. Idempotent.

DROP POLICY IF EXISTS incidents_tenant_rls ON public.incidents;
DROP POLICY IF EXISTS assets_tenant_rls ON public.church_assets;
DROP POLICY IF EXISTS asset_maintenance_rls ON public.asset_maintenance;
DROP POLICY IF EXISTS tenant_isolation ON public.asset_maintenance;

DO $e11$
DECLARE t text; staff_read text; w text;
BEGIN
  FOREACH t IN ARRAY ARRAY['incidents', 'church_assets', 'asset_maintenance'] LOOP
    staff_read := '(private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text)';
    w := 'private.can_write_permission((tenant_id)::text, ''reports_analytics'')';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p5_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_p5_read', t, staff_read);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p5_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t || '_p5_insert', t, w);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p5_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t || '_p5_update', t, w, w);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p5_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', t || '_p5_delete', t, w);
  END LOOP;
END
$e11$;

DROP POLICY IF EXISTS incident_status_logs_staff_insert ON public.incident_status_logs;
CREATE POLICY incident_status_logs_staff_insert ON public.incident_status_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    private.can_write_permission((tenant_id)::text, 'reports_analytics')
    AND EXISTS (SELECT 1 FROM public.incidents i
                 WHERE i.id = incident_id AND (i.tenant_id)::text = (incident_status_logs.tenant_id)::text)
  );
