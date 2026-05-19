-- Drop the broken policy that queries auth.users
DROP POLICY IF EXISTS "tenant_isolation" ON staff_positions;
-- SELECT: authenticated users can read positions for their org
CREATE POLICY "staff_positions_select" ON staff_positions
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));
-- INSERT: authenticated users can insert positions for their org
CREATE POLICY "staff_positions_insert" ON staff_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));
-- UPDATE: authenticated users can update positions for their org
CREATE POLICY "staff_positions_update" ON staff_positions
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'))
  WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));
-- DELETE: authenticated users can delete positions for their org
CREATE POLICY "staff_positions_delete" ON staff_positions
  FOR DELETE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id'));
