-- Outreach activities: code expects name, type, people_reached, salvations,
-- visitors_captured, materials_distributed, volunteer_ids, team_leader_id,
-- status, report, follow_up_required, follow_up_count, start_time, end_time,
-- target_community, created_by

ALTER TABLE outreach_activities
  ADD COLUMN IF NOT EXISTS name VARCHAR,
  ADD COLUMN IF NOT EXISTS type VARCHAR,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS target_community VARCHAR,
  ADD COLUMN IF NOT EXISTS people_reached INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salvations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visitors_captured INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_distributed TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS team_leader_id VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS report TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_by VARCHAR,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_outreach_activities_tenant_id ON outreach_activities(tenant_id);;
