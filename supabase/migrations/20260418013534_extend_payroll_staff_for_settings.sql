ALTER TABLE payroll_staff
  ADD COLUMN IF NOT EXISTS custom_position         text,
  ADD COLUMN IF NOT EXISTS payment_day             integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS work_days               text[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
  ADD COLUMN IF NOT EXISTS end_date                date,
  ADD COLUMN IF NOT EXISTS staff_id_number         text,
  ADD COLUMN IF NOT EXISTS department              text,
  ADD COLUMN IF NOT EXISTS supervisor_id           text REFERENCES payroll_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tax_id                  text,
  ADD COLUMN IF NOT EXISTS routing_number          text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_relationship  text,
  ADD COLUMN IF NOT EXISTS probation_end_date      date,
  ADD COLUMN IF NOT EXISTS contract_renewal_date   date,
  ADD COLUMN IF NOT EXISTS annual_leave_days       integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS sick_leave_days         integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS health_insurance        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pension_contribution    boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_payroll_staff_tenant_id ON payroll_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff_member_id ON payroll_staff(member_id);;
