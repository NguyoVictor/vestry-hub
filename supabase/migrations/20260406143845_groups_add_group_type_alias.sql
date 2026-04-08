-- groups: code queries group_type but DB has type
-- Add group_type as a generated column alias
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS group_type VARCHAR;

-- Backfill group_type from type
UPDATE groups SET group_type = type::text WHERE group_type IS NULL;

-- services: code expects name, expected_attendance, actual_attendance, status, preacher
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS name VARCHAR,
  ADD COLUMN IF NOT EXISTS expected_attendance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_attendance INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS preacher VARCHAR,
  ADD COLUMN IF NOT EXISTS service_leader_id VARCHAR,
  ADD COLUMN IF NOT EXISTS worship_leader_id VARCHAR,
  ADD COLUMN IF NOT EXISTS color VARCHAR DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS order_of_service JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill name from title for existing rows
UPDATE services SET name = title WHERE name IS NULL AND title IS NOT NULL;;
