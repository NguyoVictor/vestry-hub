-- =====================================================
-- FIX ACCESS CONTROL BUGS
-- Run this in Supabase SQL Editor
-- =====================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BUG 1 PART A: Add missing columns to tenants table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_uses INTEGER NOT NULL DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_invite_code ON tenants(invite_code);

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('church_code', 'invite_code', 'invite_code_uses')
ORDER BY column_name;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BUG 2: Create livestream_schedules table if missing
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS livestream_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  recurrence_pattern TEXT,
  recurrence_day INTEGER,
  is_recurring BOOLEAN DEFAULT false,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tenant-based queries and live status
CREATE INDEX IF NOT EXISTS idx_livestream_schedules_tenant_live ON livestream_schedules (tenant_id, is_live);
CREATE INDEX IF NOT EXISTS idx_livestream_schedules_tenant_start ON livestream_schedules (tenant_id, start_time);

-- Enable Row Level Security
ALTER TABLE livestream_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "livestream_schedules_select" ON livestream_schedules;
DROP POLICY IF EXISTS "livestream_schedules_insert" ON livestream_schedules;
DROP POLICY IF EXISTS "livestream_schedules_update" ON livestream_schedules;
DROP POLICY IF EXISTS "livestream_schedules_delete" ON livestream_schedules;

-- RLS Policies for livestream_schedules (members can view, admins can manage)
CREATE POLICY "livestream_schedules_select" ON livestream_schedules 
  FOR SELECT TO authenticated 
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) 
    OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "livestream_schedules_insert" ON livestream_schedules 
  FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_schedules_update" ON livestream_schedules 
  FOR UPDATE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_schedules_delete" ON livestream_schedules 
  FOR DELETE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- Verify table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'livestream_schedules'
ORDER BY ordinal_position;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check tenants columns
SELECT 
  'tenants' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('church_code', 'invite_code', 'invite_code_uses')
ORDER BY column_name;

-- Check livestream_schedules table exists
SELECT 
  'livestream_schedules' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'livestream_schedules';

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('tenants', 'livestream_schedules');
