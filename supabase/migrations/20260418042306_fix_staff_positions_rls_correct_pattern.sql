-- Drop the JWT-based policies
DROP POLICY IF EXISTS "staff_positions_select" ON staff_positions;
DROP POLICY IF EXISTS "staff_positions_insert" ON staff_positions;
DROP POLICY IF EXISTS "staff_positions_update" ON staff_positions;
DROP POLICY IF EXISTS "staff_positions_delete" ON staff_positions;
-- Add a single ALL policy matching the pattern used by all other tables in this project
CREATE POLICY "sp_tenant" ON staff_positions
  FOR ALL
  TO authenticated
  USING (
    org_id = (
      SELECT users.tenant_id
      FROM users
      WHERE (users.id)::text = (auth.uid())::text
      LIMIT 1
    )::text
  )
  WITH CHECK (
    org_id = (
      SELECT users.tenant_id
      FROM users
      WHERE (users.id)::text = (auth.uid())::text
      LIMIT 1
    )::text
  );
