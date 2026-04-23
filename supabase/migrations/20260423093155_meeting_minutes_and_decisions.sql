-- meeting_minutes
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id varchar NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL,
  minutes_text text DEFAULT '',
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_minutes_meeting ON meeting_minutes(meeting_id);
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meeting_minutes_tenant_rls" ON meeting_minutes;
CREATE POLICY "meeting_minutes_tenant_rls" ON meeting_minutes
  FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);

-- meeting_decisions
CREATE TABLE IF NOT EXISTS meeting_decisions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id varchar NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL,
  decision_text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting ON meeting_decisions(meeting_id);
ALTER TABLE meeting_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meeting_decisions_tenant_rls" ON meeting_decisions;
CREATE POLICY "meeting_decisions_tenant_rls" ON meeting_decisions
  FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);

-- Add tenant_id to meeting_action_items if missing
ALTER TABLE meeting_action_items ADD COLUMN IF NOT EXISTS tenant_id varchar;
ALTER TABLE meeting_action_items ADD COLUMN IF NOT EXISTS task_description text;
-- Backfill task_description from description
UPDATE meeting_action_items SET task_description = description WHERE task_description IS NULL;

-- Add is_present to meeting_attendees
ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS is_present boolean DEFAULT true;
ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS tenant_id varchar;;
