-- Fix RLS policy for outreach_activities to allow member portal access
-- The existing policy only checks users table, but members authenticate via members table

-- Drop the existing policy
DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
-- Create new policy that checks both users and members tables
CREATE POLICY "outreach_tenant_rls" ON outreach_activities
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
    OR
    tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );
-- Add a separate SELECT policy for authenticated users (members can view)
CREATE POLICY "outreach_activities_member_select" ON outreach_activities
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
    OR
    tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );
