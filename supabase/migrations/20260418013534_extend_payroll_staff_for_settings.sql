
-- =====================================================
-- PAYROLL STAFF FOUNDATION
-- Restore the original table before extending it.
-- Based on the existing production column definitions.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payroll_staff (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,

    tenant_id VARCHAR NOT NULL,

    member_id VARCHAR,

    job_title TEXT,

    employment_type VARCHAR DEFAULT 'full_time',

    gross_salary NUMERIC NOT NULL,

    deductions JSONB DEFAULT '[]'::jsonb,

    net_salary NUMERIC NOT NULL,

    payment_method VARCHAR,

    bank_name TEXT,

    account_number TEXT,

    mpesa_number TEXT,

    pay_frequency VARCHAR DEFAULT 'monthly',

    start_date DATE,

    status VARCHAR DEFAULT 'active',

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),

    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security immediately.
ALTER TABLE public.payroll_staff
ENABLE ROW LEVEL SECURITY;

-- Tenant isolation for authenticated users.
-- This restores tenant separation, but a separate
-- administrator-permission review is required.
CREATE POLICY "payroll_staff_tenant_rls"
ON public.payroll_staff
FOR ALL
TO authenticated
USING (
    tenant_id = public.get_my_tenant_id()::text
)
WITH CHECK (
    tenant_id = public.get_my_tenant_id()::text
);

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
CREATE INDEX IF NOT EXISTS idx_payroll_staff_member_id ON payroll_staff(member_id);
