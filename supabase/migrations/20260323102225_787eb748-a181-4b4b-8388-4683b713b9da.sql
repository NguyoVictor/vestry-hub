-- Fix 1: Replace blanket users_tenant_write with self-update-only policy
DROP POLICY IF EXISTS users_tenant_write ON users;
CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (id = auth.uid()::text AND tenant_id::text = get_my_tenant_id()::text)
  WITH CHECK (id = auth.uid()::text AND tenant_id::text = get_my_tenant_id()::text);
-- Fix 2: Replace blanket integration_settings policy with admin-only
DROP POLICY IF EXISTS integrations_tenant_rls ON integration_settings;
CREATE POLICY integration_settings_admin_read ON integration_settings
  FOR SELECT
  USING (
    tenant_id::text = get_my_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
        AND role IN ('super_admin', 'staff_leader')
    )
  );
CREATE POLICY integration_settings_admin_write ON integration_settings
  FOR ALL
  USING (
    tenant_id::text = get_my_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
        AND role IN ('super_admin', 'staff_leader')
    )
  );
