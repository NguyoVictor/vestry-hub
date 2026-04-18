CREATE TABLE IF NOT EXISTS staff_payroll (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id        text NOT NULL REFERENCES payroll_staff(id) ON DELETE CASCADE,
  month           integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            integer NOT NULL,
  basic_salary    numeric(14,2) NOT NULL DEFAULT 0,
  allowances      numeric(14,2) NOT NULL DEFAULT 0,
  deductions      numeric(14,2) NOT NULL DEFAULT 0,
  net_salary      numeric(14,2) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
  payment_method  text,
  reference       text,
  notes           text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  payment_date    date,
  tenant_id       text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_tenant_id ON staff_payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_staff_id  ON staff_payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_period    ON staff_payroll(tenant_id, year, month);

ALTER TABLE staff_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON staff_payroll
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));;
