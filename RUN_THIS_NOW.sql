-- =====================================================
-- URGENT FIX - RUN THIS IN SUPABASE SQL EDITOR NOW
-- =====================================================

-- The 400 error is because member portal users can't access outreach_activities
-- This fixes the RLS policy to allow members to read the data

-- Step 1: Drop old policies
DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_admin_access" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_member_select" ON outreach_activities;

-- Step 2: Create new policies that work for both admin and members
CREATE POLICY "outreach_activities_admin_all" ON outreach_activities
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "outreach_activities_member_read" ON outreach_activities
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );

-- Step 3: Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'outreach_activities'
ORDER BY policyname;

-- You should see 2 policies:
-- 1. outreach_activities_admin_all (FOR ALL)
-- 2. outreach_activities_member_read (FOR SELECT)
