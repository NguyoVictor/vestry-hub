-- Migration: Add Livestreaming Tables
-- Description: Creates tables for livestreaming feature including configs, schedules, history, prayer requests, and reminders
-- Date: 2026-05-02

-- =====================================================
-- Table: livestream_configs
-- Description: Stores streaming platform configurations (YouTube, Facebook, Vimeo, custom)
-- =====================================================
CREATE TABLE IF NOT EXISTS livestream_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  subscribe_url TEXT,
  subscribe_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_livestream_configs_tenant_id ON livestream_configs (tenant_id);

-- Enable Row Level Security
ALTER TABLE livestream_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for livestream_configs
CREATE POLICY "livestream_configs_select" ON livestream_configs 
  FOR SELECT TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_configs_insert" ON livestream_configs 
  FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_configs_update" ON livestream_configs 
  FOR UPDATE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_configs_delete" ON livestream_configs 
  FOR DELETE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- =====================================================
-- Table: livestream_schedules
-- Description: Stores scheduled livestream events (one-time and recurring)
-- =====================================================
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

-- =====================================================
-- Table: livestream_history
-- Description: Archive of past livestream recordings
-- =====================================================
CREATE TABLE IF NOT EXISTS livestream_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  stream_date DATE NOT NULL,
  thumbnail_url TEXT,
  embed_url TEXT NOT NULL,
  youtube_video_id TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tenant-based queries and duplicate detection
CREATE INDEX IF NOT EXISTS idx_livestream_history_tenant_date ON livestream_history (tenant_id, stream_date DESC);
CREATE INDEX IF NOT EXISTS idx_livestream_history_tenant_youtube ON livestream_history (tenant_id, youtube_video_id);

-- Enable Row Level Security
ALTER TABLE livestream_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for livestream_history (members can view, admins can manage)
CREATE POLICY "livestream_history_select" ON livestream_history 
  FOR SELECT TO authenticated 
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) 
    OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "livestream_history_insert" ON livestream_history 
  FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_history_update" ON livestream_history 
  FOR UPDATE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "livestream_history_delete" ON livestream_history 
  FOR DELETE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- =====================================================
-- Table: livestream_prayer_requests
-- Description: Prayer requests submitted during live streams
-- =====================================================
CREATE TABLE IF NOT EXISTS livestream_prayer_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT,
  prayer_text TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_prayed_for BOOLEAN DEFAULT false,
  prayed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tenant-based queries and filtering
CREATE INDEX IF NOT EXISTS idx_livestream_prayer_requests_tenant_created ON livestream_prayer_requests (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livestream_prayer_requests_tenant_prayed ON livestream_prayer_requests (tenant_id, is_prayed_for);

-- Enable Row Level Security
ALTER TABLE livestream_prayer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for livestream_prayer_requests (members can insert their own, admins can view all)
CREATE POLICY "livestream_prayer_requests_member_select" ON livestream_prayer_requests 
  FOR SELECT TO authenticated 
  USING (
    member_id = auth.uid()::text 
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "livestream_prayer_requests_member_insert" ON livestream_prayer_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (
    member_id = auth.uid()::text 
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "livestream_prayer_requests_admin_update" ON livestream_prayer_requests 
  FOR UPDATE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- =====================================================
-- Table: livestream_reminders
-- Description: Member reminders for upcoming livestreams
-- =====================================================
CREATE TABLE IF NOT EXISTS livestream_reminders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  schedule_id TEXT NOT NULL REFERENCES livestream_schedules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, member_id, schedule_id)
);

-- Index for member-based queries
CREATE INDEX IF NOT EXISTS idx_livestream_reminders_tenant_member ON livestream_reminders (tenant_id, member_id);

-- Enable Row Level Security
ALTER TABLE livestream_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for livestream_reminders (members can only manage their own reminders)
CREATE POLICY "livestream_reminders_member_select" ON livestream_reminders 
  FOR SELECT TO authenticated 
  USING (member_id = auth.uid()::text);

CREATE POLICY "livestream_reminders_member_insert" ON livestream_reminders 
  FOR INSERT TO authenticated 
  WITH CHECK (member_id = auth.uid()::text);

CREATE POLICY "livestream_reminders_member_delete" ON livestream_reminders 
  FOR DELETE TO authenticated 
  USING (member_id = auth.uid()::text);

-- =====================================================
-- Migration Complete
-- =====================================================
-- Tables created:
-- 1. livestream_configs - Platform configurations
-- 2. livestream_schedules - Scheduled streams
-- 3. livestream_history - Past stream archive
-- 4. livestream_prayer_requests - Prayer submissions
-- 5. livestream_reminders - Member reminders
--
-- All tables have:
-- - Row Level Security enabled
-- - Appropriate indexes for performance
-- - Tenant isolation policies
-- =====================================================
