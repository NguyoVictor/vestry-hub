CREATE TABLE IF NOT EXISTS staff_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assigned_to TEXT NOT NULL REFERENCES payroll_staff(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  org_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_id ON staff_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_tenant" ON staff_tasks
  FOR ALL
  TO authenticated
  USING (
    org_id = (
      SELECT users.tenant_id FROM users
      WHERE (users.id)::text = (auth.uid())::text
      LIMIT 1
    )::text
  )
  WITH CHECK (
    org_id = (
      SELECT users.tenant_id FROM users
      WHERE (users.id)::text = (auth.uid())::text
      LIMIT 1
    )::text
  );
CREATE OR REPLACE FUNCTION update_staff_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER staff_tasks_updated_at
  BEFORE UPDATE ON staff_tasks
  FOR EACH ROW EXECUTE FUNCTION update_staff_tasks_updated_at();
