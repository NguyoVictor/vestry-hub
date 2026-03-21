
-- Fix: drop existing policies before recreating
DROP POLICY IF EXISTS "pledge_campaigns_tenant_rls" ON pledge_campaigns;
CREATE POLICY "pledge_campaigns_tenant_rls" ON pledge_campaigns FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

-- Create remaining tables that may not exist yet
CREATE TABLE IF NOT EXISTS pledges (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  campaign_id varchar NOT NULL REFERENCES pledge_campaigns(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL,
  member_id varchar,
  pledger_name text,
  is_anonymous boolean DEFAULT false,
  pledge_amount numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  fulfillment_status varchar DEFAULT 'pending',
  pledge_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "pledges_tenant_rls" ON pledges;
CREATE POLICY "pledges_tenant_rls" ON pledges FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS payroll_staff (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id varchar NOT NULL,
  member_id varchar,
  job_title text,
  employment_type varchar DEFAULT 'full_time',
  gross_salary numeric NOT NULL,
  deductions jsonb DEFAULT '[]',
  net_salary numeric NOT NULL,
  payment_method varchar,
  bank_name text,
  account_number text,
  mpesa_number text,
  pay_frequency varchar DEFAULT 'monthly',
  start_date date,
  status varchar DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "payroll_staff_tenant_rls" ON payroll_staff;
CREATE POLICY "payroll_staff_tenant_rls" ON payroll_staff FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id varchar NOT NULL,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  total_gross numeric NOT NULL,
  total_deductions numeric NOT NULL,
  total_net numeric NOT NULL,
  staff_count integer NOT NULL,
  processed_by varchar,
  processed_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "payroll_runs_tenant_rls" ON payroll_runs;
CREATE POLICY "payroll_runs_tenant_rls" ON payroll_runs FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS payroll_payments (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  payroll_run_id varchar NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  payroll_staff_id varchar REFERENCES payroll_staff(id) ON DELETE SET NULL,
  tenant_id varchar NOT NULL,
  gross_amount numeric NOT NULL,
  deductions_breakdown jsonb NOT NULL,
  net_amount numeric NOT NULL,
  payment_method text,
  payment_reference text,
  created_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "payroll_payments_tenant_rls" ON payroll_payments;
CREATE POLICY "payroll_payments_tenant_rls" ON payroll_payments FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS fund_transactions (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  fund_id varchar NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL,
  type varchar NOT NULL,
  amount numeric NOT NULL,
  description text,
  reference_id varchar,
  reference_type varchar,
  running_balance numeric,
  transaction_date date DEFAULT CURRENT_DATE,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "fund_transactions_tenant_rls" ON fund_transactions;
CREATE POLICY "fund_transactions_tenant_rls" ON fund_transactions FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS invoices (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id varchar NOT NULL,
  invoice_number text,
  vendor_name varchar NOT NULL,
  vendor_email varchar,
  vendor_phone varchar,
  description text,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL,
  tax_percent numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  currency varchar DEFAULT 'KES',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  payment_terms varchar DEFAULT 'net_30',
  status varchar DEFAULT 'pending',
  document_url text,
  notes text,
  paid_at date,
  payment_method varchar,
  payment_reference text,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "invoices_tenant_rls" ON invoices;
CREATE POLICY "invoices_tenant_rls" ON invoices FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id varchar NOT NULL,
  account_name text NOT NULL,
  account_type varchar NOT NULL,
  account_code text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "chart_of_accounts_tenant_rls" ON chart_of_accounts;
CREATE POLICY "chart_of_accounts_tenant_rls" ON chart_of_accounts FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS journal_entries (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id varchar NOT NULL,
  journal_number text,
  description text NOT NULL,
  reference text,
  entry_date date DEFAULT CURRENT_DATE,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "journal_entries_tenant_rls" ON journal_entries;
CREATE POLICY "journal_entries_tenant_rls" ON journal_entries FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE TABLE IF NOT EXISTS journal_lines (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  journal_entry_id varchar NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id varchar NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount numeric DEFAULT 0,
  credit_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
DROP POLICY IF EXISTS "journal_lines_tenant_rls" ON journal_lines;
CREATE POLICY "journal_lines_tenant_rls" ON journal_lines FOR ALL USING (
  (journal_entry_id)::text IN (SELECT id FROM journal_entries WHERE (tenant_id)::text = (get_my_tenant_id())::text)
);

CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_tenant_id varchar)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chart_of_accounts (tenant_id, account_name, account_type, account_code, is_default) VALUES
    (p_tenant_id, 'Cash on Hand', 'asset', '1001', true),
    (p_tenant_id, 'Bank Account (General)', 'asset', '1002', true),
    (p_tenant_id, 'Bank Account (Savings)', 'asset', '1003', true),
    (p_tenant_id, 'Accounts Receivable', 'asset', '1100', true),
    (p_tenant_id, 'Prepaid Expenses', 'asset', '1200', true),
    (p_tenant_id, 'Property & Equipment', 'asset', '1500', true),
    (p_tenant_id, 'Accounts Payable', 'liability', '2001', true),
    (p_tenant_id, 'Accrued Expenses', 'liability', '2100', true),
    (p_tenant_id, 'Deferred Revenue', 'liability', '2200', true),
    (p_tenant_id, 'Tithes', 'income', '4001', true),
    (p_tenant_id, 'Offerings', 'income', '4002', true),
    (p_tenant_id, 'Building Fund', 'income', '4003', true),
    (p_tenant_id, 'Donations', 'income', '4004', true),
    (p_tenant_id, 'Event Income', 'income', '4005', true),
    (p_tenant_id, 'Other Income', 'income', '4999', true),
    (p_tenant_id, 'Salaries & Wages', 'expense', '5001', true),
    (p_tenant_id, 'Utilities', 'expense', '5002', true),
    (p_tenant_id, 'Rent', 'expense', '5003', true),
    (p_tenant_id, 'Equipment', 'expense', '5004', true),
    (p_tenant_id, 'Maintenance', 'expense', '5005', true),
    (p_tenant_id, 'Events', 'expense', '5006', true),
    (p_tenant_id, 'Outreach', 'expense', '5007', true),
    (p_tenant_id, 'Supplies', 'expense', '5008', true),
    (p_tenant_id, 'Transport', 'expense', '5009', true),
    (p_tenant_id, 'Other Expenses', 'expense', '5999', true),
    (p_tenant_id, 'Retained Surplus', 'equity', '3001', true),
    (p_tenant_id, 'Opening Balance Equity', 'equity', '3002', true);
END;
$$ LANGUAGE plpgsql;
