-- Fix remaining RLS policies for sermon engagement
-- Run this if you got "policy already exists" error

-- Drop the policy that already exists
DROP POLICY IF EXISTS "Anyone can view sermon views" ON sermon_views;

-- Recreate it
CREATE POLICY "Anyone can view sermon views"
  ON sermon_views FOR SELECT
  USING (true);

-- Verify all tables exist and have correct policies
-- This will show you what's set up

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views')
ORDER BY tablename, policyname;
