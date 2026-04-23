-- Add columns to volunteer_roles
ALTER TABLE volunteer_roles
  ADD COLUMN IF NOT EXISTS requirements text,
  ADD COLUMN IF NOT EXISTS time_commitment text,
  ADD COLUMN IF NOT EXISTS department_color text;

-- Add columns to volunteers (assignments)
ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- Create volunteer_hours table
CREATE TABLE IF NOT EXISTS volunteer_hours (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id varchar REFERENCES volunteers(id) ON DELETE SET NULL,
  volunteer_member_id varchar NOT NULL,
  role_id varchar REFERENCES volunteer_roles(id) ON DELETE SET NULL,
  hours decimal(6,2) NOT NULL DEFAULT 0,
  activity_description text,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  logged_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_hours_tenant ON volunteer_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_member ON volunteer_hours(volunteer_member_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_role ON volunteer_hours(role_id);

ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "volunteer_hours_tenant_rls" ON volunteer_hours;
CREATE POLICY "volunteer_hours_tenant_rls" ON volunteer_hours
  FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);

-- Allow anon reads on volunteer_roles for member portal
DROP POLICY IF EXISTS "volunteer_roles_public_read" ON volunteer_roles;
CREATE POLICY "volunteer_roles_public_read" ON volunteer_roles
  FOR SELECT TO anon USING (true);

-- Allow anon insert/read/delete on volunteers for member portal signups
DROP POLICY IF EXISTS "volunteers_public_read" ON volunteers;
CREATE POLICY "volunteers_public_read" ON volunteers
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "volunteers_public_insert" ON volunteers;
CREATE POLICY "volunteers_public_insert" ON volunteers
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "volunteers_public_delete" ON volunteers;
CREATE POLICY "volunteers_public_delete" ON volunteers
  FOR DELETE TO anon USING (true);;
