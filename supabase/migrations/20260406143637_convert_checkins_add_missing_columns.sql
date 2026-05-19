-- convert_checkins: code inserts tenant_id, next_checkin_date

ALTER TABLE convert_checkins
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR,
  ADD COLUMN IF NOT EXISTS next_checkin_date DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_convert_checkins_convert_id ON convert_checkins(convert_id);
