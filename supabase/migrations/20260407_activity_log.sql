-- ============================================================
-- ACTIVITY LOG TABLE
-- Powers the "Recent Activity" feed on the Dashboard
-- Uses tenant_id (actual DB schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'new_member', 'member_updated', 'member_removed',
    'new_donation', 'new_event', 'event_updated', 'event_cancelled',
    'new_group', 'new_announcement', 'announcement_published',
    'new_visitor', 'visitor_converted',
    'new_convert', 'stage_advanced', 'convert_graduated', 'baptism_completed', 'checkin_logged',
    'new_expense', 'expense_approved', 'payroll_processed',
    'new_request', 'request_resolved',
    'new_testimony', 'testimony_published',
    'new_broadcast', 'new_service', 'attendance_recorded',
    'new_pledge', 'booking_approved', 'new_incident', 'system'
  )),
  description TEXT NOT NULL,
  actor_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_avatar_url TEXT,
  entity_type TEXT,
  entity_id VARCHAR,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view activity log"
  ON activity_log FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()::text
  ));

CREATE POLICY "Authenticated users can insert activity log entries"
  ON activity_log FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()::text
  ));

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_time
  ON activity_log(tenant_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
