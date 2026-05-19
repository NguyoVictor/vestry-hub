-- =====================================================
-- PRODUCTION OPTIMIZATION: CRITICAL PERFORMANCE INDEXES
-- =====================================================
-- Based on Martin Kleppmann's "Designing Data-Intensive Applications"
-- This migration adds essential indexes for production scalability

-- ─── MULTI-TENANT ISOLATION INDEXES (MOST CRITICAL) ─────────────────────────
-- These indexes are essential for multi-tenant performance and security

-- Core tenant isolation - EVERY query filters by tenant_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_church_code ON tenants(church_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_id ON members(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_groups_tenant_id ON groups(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_giving_records_tenant_id ON giving_records(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_volunteers_tenant_id ON volunteers(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_tenant_id ON announcements(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_testimonies_tenant_id ON testimonies(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sermons_tenant_id ON sermons(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_tenant_id ON songs(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
-- ─── COMPOUND INDEXES FOR COMMON QUERY PATTERNS ─────────────────────────────
-- These optimize the most frequent multi-column queries

-- Members: tenant + status (member lists, active members)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_status ON members(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_membership_status ON members(tenant_id, membership_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_created ON members(tenant_id, created_at DESC);
-- Events: tenant + published status (public event lists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_published ON events(tenant_id, is_published);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_date ON events(tenant_id, event_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_status_date ON events(tenant_id, is_published, event_date DESC);
-- Services: tenant + published (service schedules)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_tenant_published ON services(tenant_id, is_published);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_tenant_date ON services(tenant_id, service_date DESC);
-- Activity Log: tenant + timestamp (recent activity feeds)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_tenant_created ON activity_log(tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_tenant_actor ON activity_log(tenant_id, actor_id, created_at DESC);
-- Giving Records: tenant + date (financial reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_giving_records_tenant_date ON giving_records(tenant_id, given_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_giving_records_tenant_member ON giving_records(tenant_id, member_id, given_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_giving_records_tenant_type ON giving_records(tenant_id, giving_type);
-- Announcements: tenant + published + priority (announcement feeds)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_tenant_published ON announcements(tenant_id, is_published);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_tenant_created ON announcements(tenant_id, created_at DESC);
-- ─── FOREIGN KEY INDEXES (PREVENT LOCK CONTENTION) ──────────────────────────
-- These prevent table locks during DELETE operations

-- Group relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_member_id ON group_members(member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_tenant_id ON group_members(tenant_id);
-- Event relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_rsvps_member_id ON event_rsvps(member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
-- Family relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_members_member_id ON family_members(member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_families_tenant_id ON families(tenant_id);
-- Attendance relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_records_member_id ON attendance_records(member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_sessions_tenant_id ON attendance_sessions(tenant_id);
-- Volunteer relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_volunteer_assignments_volunteer_id ON volunteer_assignments(volunteer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_volunteer_assignments_event_id ON volunteer_assignments(event_id);
-- ─── SEARCH AND FILTERING INDEXES ───────────────────────────────────────────
-- These optimize text search and filtering operations

-- Member search (name, email, phone)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_email ON members(tenant_id, email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_phone ON members(tenant_id, phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_name ON members(tenant_id, first_name, last_name);
-- Full-text search indexes (for PostgreSQL text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_search_vector ON members USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search_vector ON events USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sermons_search_vector ON sermons USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
-- ─── PERFORMANCE MONITORING INDEXES ─────────────────────────────────────────
-- These support performance monitoring and analytics

-- User activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC) WHERE last_seen_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_portal_last_seen ON members(portal_last_seen DESC) WHERE portal_last_seen IS NOT NULL;
-- System health monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
-- ─── PARTIAL INDEXES FOR EFFICIENCY ─────────────────────────────────────────
-- These indexes only include relevant rows to save space and improve performance

-- Only index active/published records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_active ON members(tenant_id, created_at DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_published ON events(tenant_id, event_date DESC) WHERE is_published = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_published ON services(tenant_id, service_date DESC) WHERE is_published = true;
-- Only index recent activity (last 6 months)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_recent ON activity_log(tenant_id, created_at DESC) 
  WHERE created_at > (CURRENT_DATE - INTERVAL '6 months');
-- ─── UNIQUE CONSTRAINTS FOR DATA INTEGRITY ──────────────────────────────────
-- These prevent duplicate data and ensure referential integrity

-- Prevent duplicate families per tenant
ALTER TABLE families ADD CONSTRAINT IF NOT EXISTS unique_family_name_per_tenant 
  UNIQUE (tenant_id, name);
-- Prevent duplicate members per tenant (email uniqueness)
ALTER TABLE members ADD CONSTRAINT IF NOT EXISTS unique_member_email_per_tenant 
  UNIQUE (tenant_id, email);
-- Prevent duplicate groups per tenant
ALTER TABLE groups ADD CONSTRAINT IF NOT EXISTS unique_group_name_per_tenant 
  UNIQUE (tenant_id, name);
-- Prevent duplicate events per tenant (same title + date)
ALTER TABLE events ADD CONSTRAINT IF NOT EXISTS unique_event_title_date_per_tenant 
  UNIQUE (tenant_id, title, event_date);
-- Prevent duplicate group memberships
ALTER TABLE group_members ADD CONSTRAINT IF NOT EXISTS unique_group_member_per_tenant 
  UNIQUE (tenant_id, group_id, member_id);
-- Prevent duplicate family memberships
ALTER TABLE family_members ADD CONSTRAINT IF NOT EXISTS unique_family_member 
  UNIQUE (family_id, member_id);
-- Prevent duplicate RSVP entries
ALTER TABLE event_rsvps ADD CONSTRAINT IF NOT EXISTS unique_event_rsvp 
  UNIQUE (event_id, member_id);
-- ─── PERFORMANCE STATISTICS UPDATE ──────────────────────────────────────────
-- Update table statistics for query planner optimization

ANALYZE tenants;
ANALYZE users;
ANALYZE members;
ANALYZE groups;
ANALYZE events;
ANALYZE services;
ANALYZE giving_records;
ANALYZE activity_log;
ANALYZE notifications;
-- ─── COMMENTS FOR DOCUMENTATION ─────────────────────────────────────────────

COMMENT ON INDEX idx_members_tenant_id IS 'Critical for multi-tenant isolation - every member query filters by tenant_id';
COMMENT ON INDEX idx_activity_log_tenant_created IS 'Optimizes activity feed queries with tenant isolation and time ordering';
COMMENT ON INDEX idx_events_tenant_published IS 'Optimizes public event listings with tenant isolation';
COMMENT ON INDEX idx_members_search_vector IS 'Full-text search across member names and email';
-- ─── PERFORMANCE VALIDATION ─────────────────────────────────────────────────

-- Verify critical indexes exist
DO $$
BEGIN
  -- Check if critical indexes exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_tenant_id') THEN
    RAISE EXCEPTION 'Critical index idx_members_tenant_id was not created successfully';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_log_tenant_created') THEN
    RAISE EXCEPTION 'Critical index idx_activity_log_tenant_created was not created successfully';
  END IF;
  
  RAISE NOTICE 'All critical performance indexes created successfully';
END $$;
