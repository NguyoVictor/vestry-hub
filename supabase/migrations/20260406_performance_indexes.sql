-- ============================================================
-- PERFORMANCE INDEXES
-- Per vestry-project.md: "Always add indexes on church_id for every new table"
-- Uses tenant_id (actual DB schema)
-- ============================================================

-- Phase 8 new tables
CREATE INDEX IF NOT EXISTS idx_discipleship_resources_tenant ON discipleship_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_tenant ON resource_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_collections_tenant ON resource_collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_enrollment ON lesson_completions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_course_comments_course ON course_comments(course_id);

-- Phase 9 new tables
CREATE INDEX IF NOT EXISTS idx_saved_reports_tenant ON saved_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_tenant ON prayer_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_member ON prayer_requests(member_id);

-- Core tables queried heavily
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_created ON users(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_tenant_date ON events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_groups_tenant_active ON groups(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_time ON activity_log(tenant_id, created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member ON event_rsvps(member_id);
