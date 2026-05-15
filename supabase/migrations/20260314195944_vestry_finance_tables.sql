-- Pledge Campaigns
CREATE TABLE IF NOT EXISTS pledge_campaigns (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  description text,
  target_amount numeric(12,2),
  currency varchar(3) DEFAULT 'KES',
  start_date date,
  end_date date,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Pledges
CREATE TABLE IF NOT EXISTS pledges (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id varchar NOT NULL REFERENCES pledge_campaigns(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id),
  committed_amount numeric(12,2) NOT NULL,
  fulfilled_amount numeric(12,2) DEFAULT 0,
  payment_schedule payment_schedule_enum DEFAULT 'one_time',
  status pledge_status_enum DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
-- Giving Records
CREATE TABLE IF NOT EXISTS giving_records (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar REFERENCES users(id),
  amount numeric(12,2) NOT NULL,
  currency varchar(3) DEFAULT 'KES',
  giving_type giving_type_enum NOT NULL,
  payment_method payment_method_enum NOT NULL,
  payment_status payment_status_enum DEFAULT 'confirmed',
  pledge_id varchar REFERENCES pledges(id),
  pesapal_transaction_id varchar,
  receipt_url varchar,
  recorded_by varchar REFERENCES users(id),
  given_at date NOT NULL DEFAULT CURRENT_DATE,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz DEFAULT now()
);
-- Giving Audit Log
CREATE TABLE IF NOT EXISTS giving_audit_log (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  giving_record_id varchar NOT NULL REFERENCES giving_records(id),
  action varchar NOT NULL,
  changed_by varchar REFERENCES users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);
-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description varchar NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency varchar(3) DEFAULT 'KES',
  category varchar,
  payment_method varchar,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url varchar,
  recorded_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  period budget_period_enum DEFAULT 'monthly',
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);
-- Budget Categories
CREATE TABLE IF NOT EXISTS budget_categories (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  budget_id varchar NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category varchar NOT NULL,
  allocated_amount numeric(12,2) NOT NULL,
  spent_amount numeric(12,2) DEFAULT 0
);
-- Payroll
CREATE TABLE IF NOT EXISTS payroll_records (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id varchar NOT NULL REFERENCES users(id),
  amount numeric(12,2) NOT NULL,
  currency varchar(3) DEFAULT 'KES',
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  payment_method payment_method_enum DEFAULT 'bank_transfer',
  payment_status payment_status_enum DEFAULT 'pending',
  notes text,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Fund Accounting
CREATE TABLE IF NOT EXISTS funds (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  description text,
  balance numeric(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- General Ledger
CREATE TABLE IF NOT EXISTS ledger_entries (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fund_id varchar REFERENCES funds(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description varchar NOT NULL,
  debit_amount numeric(12,2) DEFAULT 0,
  credit_amount numeric(12,2) DEFAULT 0,
  reference_type varchar,
  reference_id varchar,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Accounts Payable
CREATE TABLE IF NOT EXISTS accounts_payable (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_name varchar NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL,
  currency varchar(3) DEFAULT 'KES',
  due_date date,
  payment_status payment_status_enum DEFAULT 'pending',
  invoice_url varchar,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_name varchar NOT NULL,
  recipient_id varchar REFERENCES users(id),
  amount numeric(12,2) NOT NULL,
  currency varchar(3) DEFAULT 'KES',
  payment_method payment_method_enum DEFAULT 'bank_transfer',
  payment_status payment_status_enum DEFAULT 'pending',
  reference varchar,
  notes text,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
