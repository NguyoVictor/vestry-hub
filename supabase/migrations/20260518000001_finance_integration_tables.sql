-- Finance Integration Tables Migration
-- Enables cross-page integration for the finance module

-- Auto journal entry function
CREATE OR REPLACE FUNCTION post_auto_journal_entry(
  p_tenant_id varchar,
  p_description text,
  p_reference varchar,
  p_date date,
  p_lines jsonb -- [{ account, debit, credit }]
) RETURNS varchar AS $$
DECLARE
  v_entry_id varchar;
BEGIN
  INSERT INTO journal_entries (tenant_id, description, reference, date, posted_by)
  VALUES (p_tenant_id, p_description, p_reference, p_date, 'system')
  RETURNING id INTO v_entry_id;
  
  INSERT INTO journal_lines (entry_id, account, debit, credit)
  SELECT v_entry_id, (line->>'account'), (line->>'debit')::numeric, (line->>'credit')::numeric
  FROM jsonb_array_elements(p_lines) AS line;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;
-- Add missing columns to existing payroll_runs table if they don't exist
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'status') THEN
    ALTER TABLE payroll_runs ADD COLUMN status varchar(20) DEFAULT 'draft';
  END IF;
  
  -- Add journal_entry_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'journal_entry_id') THEN
    ALTER TABLE payroll_runs ADD COLUMN journal_entry_id varchar;
  END IF;
  
  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'completed_at') THEN
    ALTER TABLE payroll_runs ADD COLUMN completed_at timestamptz;
  END IF;
END $$;
-- Payroll run lines (using varchar IDs to match existing schema)
CREATE TABLE IF NOT EXISTS payroll_run_lines (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  run_id varchar REFERENCES payroll_runs(id),
  staff_id varchar,
  gross_amount numeric,
  net_amount numeric,
  payment_method varchar(20),
  payout_status varchar(20) DEFAULT 'pending',
  payhero_reference varchar(50),
  paid_at timestamptz
);
-- Create indexes for payroll tables
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_id ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_run_id ON payroll_run_lines(run_id);
-- Enable RLS on new tables
ALTER TABLE payroll_run_lines ENABLE ROW LEVEL SECURITY;
-- RLS policies for payroll_run_lines
CREATE POLICY "Users can view their tenant's payroll run lines" ON payroll_run_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payroll_runs pr 
      WHERE pr.id = payroll_run_lines.run_id 
      AND pr.tenant_id = current_setting('app.current_tenant_id', true)
    )
  );
CREATE POLICY "Users can manage their tenant's payroll run lines" ON payroll_run_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payroll_runs pr 
      WHERE pr.id = payroll_run_lines.run_id 
      AND pr.tenant_id = current_setting('app.current_tenant_id', true)
    )
  );
