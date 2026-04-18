CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id TEXT NOT NULL REFERENCES payroll_staff(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER,
  reason TEXT,
  cover_staff_id TEXT REFERENCES payroll_staff(id) ON DELETE SET NULL,
  cover_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slr_tenant ON staff_leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slr_staff  ON staff_leave_requests(staff_id);
ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY slr_tenant ON staff_leave_requests USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE TABLE IF NOT EXISTS staff_leave_balances (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id TEXT NOT NULL REFERENCES payroll_staff(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  annual_leave_total INTEGER DEFAULT 14,
  annual_leave_used INTEGER DEFAULT 0,
  sick_leave_total INTEGER DEFAULT 10,
  sick_leave_used INTEGER DEFAULT 0,
  maternity_leave_total INTEGER DEFAULT 90,
  maternity_leave_used INTEGER DEFAULT 0,
  paternity_leave_total INTEGER DEFAULT 14,
  paternity_leave_used INTEGER DEFAULT 0,
  compassionate_leave_total INTEGER DEFAULT 3,
  compassionate_leave_used INTEGER DEFAULT 0,
  unpaid_leave_used INTEGER DEFAULT 0,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, year)
);
CREATE INDEX IF NOT EXISTS idx_slb_tenant ON staff_leave_balances(tenant_id);
ALTER TABLE staff_leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY slb_tenant ON staff_leave_balances USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE TABLE IF NOT EXISTS staff_absences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id TEXT NOT NULL REFERENCES payroll_staff(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'unexcused' CHECK (status IN ('excused','unexcused')),
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sa_tenant ON staff_absences(tenant_id);
ALTER TABLE staff_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_tenant ON staff_absences USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));;
