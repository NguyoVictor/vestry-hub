-- ============================================================
-- RLS POLICIES — tenant isolation pattern
-- Helper function: get current user's tenant_id
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS varchar LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()::text
$$;
-- ---- TENANTS ----
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_self_read" ON tenants;
CREATE POLICY "tenant_self_read" ON tenants
  FOR SELECT USING (id = get_my_tenant_id());
DROP POLICY IF EXISTS "tenant_self_write" ON tenants;
CREATE POLICY "tenant_self_write" ON tenants
  FOR UPDATE USING (id = get_my_tenant_id());
-- ---- USERS ----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_tenant_read" ON users;
CREATE POLICY "users_tenant_read" ON users
  FOR SELECT USING (tenant_id = get_my_tenant_id());
DROP POLICY IF EXISTS "users_tenant_write" ON users;
CREATE POLICY "users_tenant_write" ON users
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- MEMBERS ----
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_tenant_read" ON members;
CREATE POLICY "members_tenant_read" ON members
  FOR SELECT USING (tenant_id = get_my_tenant_id());
DROP POLICY IF EXISTS "members_tenant_write" ON members;
CREATE POLICY "members_tenant_write" ON members
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- FAMILIES ----
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "families_tenant_read" ON families;
CREATE POLICY "families_tenant_read" ON families
  FOR SELECT USING (tenant_id = get_my_tenant_id());
DROP POLICY IF EXISTS "families_tenant_write" ON families;
CREATE POLICY "families_tenant_write" ON families
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- BRANCHES ----
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_tenant_read" ON branches;
CREATE POLICY "branches_tenant_read" ON branches
  FOR SELECT USING (tenant_id = get_my_tenant_id());
DROP POLICY IF EXISTS "branches_tenant_write" ON branches;
CREATE POLICY "branches_tenant_write" ON branches
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- GROUPS ----
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_tenant_read" ON groups;
CREATE POLICY "groups_tenant_read" ON groups
  FOR SELECT USING (tenant_id = get_my_tenant_id());
DROP POLICY IF EXISTS "groups_tenant_write" ON groups;
CREATE POLICY "groups_tenant_write" ON groups
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- GROUP_MEMBERS ----
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_tenant_read" ON group_members;
CREATE POLICY "group_members_tenant_read" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT id FROM groups WHERE tenant_id = get_my_tenant_id())
  );
DROP POLICY IF EXISTS "group_members_tenant_write" ON group_members;
CREATE POLICY "group_members_tenant_write" ON group_members
  FOR ALL USING (
    group_id IN (SELECT id FROM groups WHERE tenant_id = get_my_tenant_id())
  );
-- ---- VISITORS ----
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visitors_tenant_rls" ON visitors;
CREATE POLICY "visitors_tenant_rls" ON visitors
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- NEW_CONVERTS ----
ALTER TABLE new_converts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "new_converts_tenant_rls" ON new_converts;
CREATE POLICY "new_converts_tenant_rls" ON new_converts
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- FOLLOW_UP_TASKS ----
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follow_up_tasks_tenant_rls" ON follow_up_tasks;
CREATE POLICY "follow_up_tasks_tenant_rls" ON follow_up_tasks
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- GIVING_RECORDS ----
ALTER TABLE giving_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "giving_records_tenant_rls" ON giving_records;
CREATE POLICY "giving_records_tenant_rls" ON giving_records
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- GIVING_AUDIT_LOG ----
ALTER TABLE giving_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "giving_audit_tenant_rls" ON giving_audit_log;
CREATE POLICY "giving_audit_tenant_rls" ON giving_audit_log
  FOR SELECT USING (
    giving_record_id IN (SELECT id FROM giving_records WHERE tenant_id = get_my_tenant_id())
  );
-- ---- PLEDGE_CAMPAIGNS ----
ALTER TABLE pledge_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pledge_campaigns_tenant_rls" ON pledge_campaigns;
CREATE POLICY "pledge_campaigns_tenant_rls" ON pledge_campaigns
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- PLEDGES ----
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pledges_tenant_rls" ON pledges;
CREATE POLICY "pledges_tenant_rls" ON pledges
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- EXPENSES ----
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_tenant_rls" ON expenses;
CREATE POLICY "expenses_tenant_rls" ON expenses
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- BUDGETS ----
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budgets_tenant_rls" ON budgets;
CREATE POLICY "budgets_tenant_rls" ON budgets
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- BUDGET_CATEGORIES ----
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_categories_tenant_rls" ON budget_categories;
CREATE POLICY "budget_categories_tenant_rls" ON budget_categories
  FOR ALL USING (
    budget_id IN (SELECT id FROM budgets WHERE tenant_id = get_my_tenant_id())
  );
-- ---- PAYROLL_RECORDS ----
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_tenant_rls" ON payroll_records;
CREATE POLICY "payroll_tenant_rls" ON payroll_records
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- FUNDS ----
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funds_tenant_rls" ON funds;
CREATE POLICY "funds_tenant_rls" ON funds
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- LEDGER_ENTRIES ----
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_tenant_rls" ON ledger_entries;
CREATE POLICY "ledger_tenant_rls" ON ledger_entries
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- ACCOUNTS_PAYABLE ----
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ap_tenant_rls" ON accounts_payable;
CREATE POLICY "ap_tenant_rls" ON accounts_payable
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- PAYOUTS ----
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payouts_tenant_rls" ON payouts;
CREATE POLICY "payouts_tenant_rls" ON payouts
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- SERVICES ----
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_tenant_rls" ON services;
CREATE POLICY "services_tenant_rls" ON services
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- EVENTS ----
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_tenant_rls" ON events;
CREATE POLICY "events_tenant_rls" ON events
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- EVENT_REGISTRATIONS ----
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_reg_tenant_rls" ON event_registrations;
CREATE POLICY "event_reg_tenant_rls" ON event_registrations
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE tenant_id = get_my_tenant_id())
  );
-- ---- ATTENDANCE_SESSIONS ----
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_sessions_tenant_rls" ON attendance_sessions;
CREATE POLICY "att_sessions_tenant_rls" ON attendance_sessions
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- ATTENDANCE_RECORDS ----
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_records_tenant_rls" ON attendance_records;
CREATE POLICY "att_records_tenant_rls" ON attendance_records
  FOR ALL USING (
    session_id IN (SELECT id FROM attendance_sessions WHERE tenant_id = get_my_tenant_id())
  );
-- ---- VOLUNTEER_ASSIGNMENTS ----
ALTER TABLE volunteer_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "volunteer_tenant_rls" ON volunteer_assignments;
CREATE POLICY "volunteer_tenant_rls" ON volunteer_assignments
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- MEMBER_REQUESTS ----
ALTER TABLE member_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "member_requests_tenant_rls" ON member_requests;
CREATE POLICY "member_requests_tenant_rls" ON member_requests
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- BOARD_MEETINGS ----
ALTER TABLE board_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "board_meetings_tenant_rls" ON board_meetings;
CREATE POLICY "board_meetings_tenant_rls" ON board_meetings
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- FACILITY_BOOKINGS ----
ALTER TABLE facility_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "facility_bookings_tenant_rls" ON facility_bookings;
CREATE POLICY "facility_bookings_tenant_rls" ON facility_bookings
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- INCIDENTS ----
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incidents_tenant_rls" ON incidents;
CREATE POLICY "incidents_tenant_rls" ON incidents
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- ANNOUNCEMENTS ----
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_tenant_rls" ON announcements;
CREATE POLICY "announcements_tenant_rls" ON announcements
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- COMMUNICATIONS ----
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comms_tenant_rls" ON communications;
CREATE POLICY "comms_tenant_rls" ON communications
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- MESSAGES ----
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_tenant_rls" ON messages;
CREATE POLICY "messages_tenant_rls" ON messages
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- NOTIFICATIONS ----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid()::text);
-- ---- TESTIMONIES ----
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonies_tenant_rls" ON testimonies;
CREATE POLICY "testimonies_tenant_rls" ON testimonies
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- SURVEYS ----
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "surveys_tenant_rls" ON surveys;
CREATE POLICY "surveys_tenant_rls" ON surveys
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- SURVEY_RESPONSES ----
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_responses_tenant_rls" ON survey_responses;
CREATE POLICY "survey_responses_tenant_rls" ON survey_responses
  FOR ALL USING (
    survey_id IN (SELECT id FROM surveys WHERE tenant_id = get_my_tenant_id())
  );
-- ---- OUTREACH_ACTIVITIES ----
ALTER TABLE outreach_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
CREATE POLICY "outreach_tenant_rls" ON outreach_activities
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- DISCIPLESHIP_PATHWAYS ----
ALTER TABLE discipleship_pathways ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discipleship_tenant_rls" ON discipleship_pathways;
CREATE POLICY "discipleship_tenant_rls" ON discipleship_pathways
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- SERMONS ----
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sermons_tenant_rls" ON sermons;
CREATE POLICY "sermons_tenant_rls" ON sermons
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- SONGS ----
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "songs_tenant_rls" ON songs;
CREATE POLICY "songs_tenant_rls" ON songs
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- CHURCH_ASSETS ----
ALTER TABLE church_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets_tenant_rls" ON church_assets;
CREATE POLICY "assets_tenant_rls" ON church_assets
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- RESOURCES ----
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resources_tenant_rls" ON resources;
CREATE POLICY "resources_tenant_rls" ON resources
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- TRAINING_COURSES ----
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_tenant_rls" ON training_courses;
CREATE POLICY "training_tenant_rls" ON training_courses
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- TRAINING_ENROLLMENTS ----
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_tenant_rls" ON training_enrollments;
CREATE POLICY "enrollments_tenant_rls" ON training_enrollments
  FOR ALL USING (
    course_id IN (SELECT id FROM training_courses WHERE tenant_id = get_my_tenant_id())
  );
-- ---- ONBOARDING_PROGRESS ----
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_tenant_rls" ON onboarding_progress;
CREATE POLICY "onboarding_tenant_rls" ON onboarding_progress
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- ROLE_PERMISSIONS ----
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_perms_tenant_rls" ON role_permissions;
CREATE POLICY "role_perms_tenant_rls" ON role_permissions
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- INTEGRATION_SETTINGS ----
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "integrations_tenant_rls" ON integration_settings;
CREATE POLICY "integrations_tenant_rls" ON integration_settings
  FOR ALL USING (tenant_id = get_my_tenant_id());
-- ---- EMAIL_QUOTAS ----
ALTER TABLE email_quotas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_quotas_tenant_rls" ON email_quotas;
CREATE POLICY "email_quotas_tenant_rls" ON email_quotas
  FOR ALL USING (tenant_id = get_my_tenant_id());
