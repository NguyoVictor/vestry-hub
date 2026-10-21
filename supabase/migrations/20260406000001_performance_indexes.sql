-- ============================================================
-- PERFORMANCE INDEXES
-- Per vestry-project.md: "Always add indexes on church_id for every new table"
-- Uses tenant_id (actual DB schema)
-- ============================================================

-- Phase 8 new tables
-- ============================================================
-- PHASE 8 AND PHASE 9 INDEXES
-- ============================================================
-- These tables are created by later migrations.
--
-- Phase 8:
--   20260406094846_phase8_discipleship_resources.sql
--   20260406094911_phase8_store_tables.sql
--   20260406094931_phase8_training_tables.sql
--
-- Phase 9:
--   20260406095120_phase9_saved_reports_prayer.sql
--
-- Their indexes are created by their respective migrations
-- and later performance-index migrations.
--
-- Do not create their indexes before the tables exist.
-- Core tables queried heavily
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_created ON users(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_tenant_date ON events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_groups_tenant_active ON groups(tenant_id, is_active);
-- Create activity_log index only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_time ON activity_log(tenant_id, created_at DESC);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_new_converts_tenant ON new_converts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_giving_records_tenant ON giving_records(tenant_id, given_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant ON visitors(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_tenant ON follow_up_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_testimonies_tenant ON testimonies(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_requests_tenant ON member_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_media_tenant ON studio_media(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_activities_tenant ON outreach_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_tenant ON training_courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_member ON group_members(member_id);
-- Event registrations: current canonical table
CREATE INDEX IF NOT EXISTS idx_event_registrations_event
ON event_registrations(event_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_member
ON event_registrations(member_id);
