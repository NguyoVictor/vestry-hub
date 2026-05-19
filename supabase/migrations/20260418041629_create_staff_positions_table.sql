CREATE TABLE IF NOT EXISTS staff_positions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  org_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, org_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_positions_org_id ON staff_positions(org_id);
ALTER TABLE staff_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON staff_positions
  USING (org_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid()));
CREATE OR REPLACE FUNCTION update_staff_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER staff_positions_updated_at
  BEFORE UPDATE ON staff_positions
  FOR EACH ROW EXECUTE FUNCTION update_staff_positions_updated_at();
