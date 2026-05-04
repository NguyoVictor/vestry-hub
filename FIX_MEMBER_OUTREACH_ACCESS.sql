-- =====================================================
-- FIX MEMBER OUTREACH PAGE ACCESS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Problem: Member portal users can't access outreach_activities
-- because RLS policy only checks users table, not members table

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Drop existing policy
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_member_select" ON outreach_activities;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Create new policy that checks both tables
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Policy for admin users (users table)
CREATE POLICY "outreach_activities_admin_access" ON outreach_activities
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- Policy for member portal users (members table) - SELECT only
CREATE POLICY "outreach_activities_member_select" ON outreach_activities
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check that RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'outreach_activities';

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'outreach_activities';

-- Test query (should return activities for your tenant)
-- SELECT id, name, activity_date, status 
-- FROM outreach_activities 
-- WHERE status = 'completed' 
-- ORDER BY activity_date DESC 
-- LIMIT 5;
