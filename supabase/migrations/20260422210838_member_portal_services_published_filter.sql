-- Services: restrict anon reads to published/completed only (same as events)
-- Draft services should NOT appear on the member portal.
DROP POLICY IF EXISTS "services_public_read" ON services;
CREATE POLICY "services_public_read" ON services
  FOR SELECT
  TO anon
  USING (status IN ('published', 'completed'));
