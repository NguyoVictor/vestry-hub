-- convert_stage_history: code inserts tenant_id and stage (not from_stage/to_stage)
-- DB has from_stage and to_stage. Add tenant_id and stage alias.

ALTER TABLE convert_stage_history
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR,
  ADD COLUMN IF NOT EXISTS stage INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_convert_stage_history_convert_id ON convert_stage_history(convert_id);
