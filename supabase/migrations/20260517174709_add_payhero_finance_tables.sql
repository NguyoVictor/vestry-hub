-- =====================================================
-- VESTRY HUB FINANCE MODULE - PAYHERO INTEGRATION
-- =====================================================
-- Add PayHero integration columns and finance tables
-- For M-Pesa payments, pledge campaigns, and payroll

-- Add PayHero channel storage to tenants
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS payhero_channel_id integer,
  ADD COLUMN IF NOT EXISTS payhero_channel_type varchar(20), -- 'bank', 'paybill', 'till'
  ADD COLUMN IF NOT EXISTS payhero_channel_number varchar(50),
  ADD COLUMN IF NOT EXISTS payhero_connected boolean DEFAULT false;
-- Add M-Pesa payment columns to giving_records
ALTER TABLE giving_records 
  ADD COLUMN IF NOT EXISTS payment_status varchar(20) DEFAULT 'pending', -- 'pending','confirmed','failed'
  ADD COLUMN IF NOT EXISTS payhero_reference varchar(50),
  ADD COLUMN IF NOT EXISTS checkout_request_id varchar(100),
  ADD COLUMN IF NOT EXISTS mpesa_receipt varchar(50),
  ADD COLUMN IF NOT EXISTS phone_number varchar(20),
  ADD COLUMN IF NOT EXISTS external_reference varchar(50);
-- Create pledge campaigns table if not exists
CREATE TABLE IF NOT EXISTS pledge_campaigns (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  description text,
  category varchar(50),
  target_amount numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(20) DEFAULT 'draft', -- 'draft','active','completed','cancelled'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Create pledge commitments table (member's pledge to a campaign)
CREATE TABLE IF NOT EXISTS pledge_commitments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar REFERENCES members(id) ON DELETE CASCADE,
  campaign_id varchar REFERENCES pledge_campaigns(id) ON DELETE CASCADE,
  pledged_amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0,
  frequency varchar(20) DEFAULT 'one-time', -- 'one-time','weekly','monthly'
  status varchar(20) DEFAULT 'active', -- 'active','fulfilled','cancelled'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Create pledge payments table (actual payment against a commitment)
CREATE TABLE IF NOT EXISTS pledge_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  commitment_id varchar REFERENCES pledge_commitments(id) ON DELETE CASCADE,
  giving_record_id varchar REFERENCES giving_records(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_status varchar(20) DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
-- Add indexes for performance (only if tables/columns exist)
CREATE INDEX IF NOT EXISTS idx_pledge_campaigns_tenant_id ON pledge_campaigns(tenant_id);
-- CREATE INDEX IF NOT EXISTS idx_pledge_campaigns_status ON pledge_campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pledge_commitments_tenant_id ON pledge_commitments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pledge_commitments_member_id ON pledge_commitments(member_id);
CREATE INDEX IF NOT EXISTS idx_pledge_commitments_campaign_id ON pledge_commitments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pledge_payments_commitment_id ON pledge_payments(commitment_id);
CREATE INDEX IF NOT EXISTS idx_giving_records_checkout_request_id ON giving_records(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_giving_records_external_reference ON giving_records(external_reference);
CREATE INDEX IF NOT EXISTS idx_giving_records_payment_status ON giving_records(tenant_id, payment_status);
-- Enable RLS on new tables
ALTER TABLE pledge_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledge_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledge_payments ENABLE ROW LEVEL SECURITY;
-- Create RLS policies for tenant isolation
CREATE POLICY "tenant_isolation" ON pledge_campaigns
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE POLICY "tenant_isolation" ON pledge_commitments
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE POLICY "tenant_isolation" ON pledge_payments
  FOR ALL
  USING (commitment_id IN (
    SELECT id FROM pledge_commitments 
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
  ));
-- Success message
DO $$
BEGIN
  RAISE NOTICE 'VestryHub Finance Module database setup complete!';
  RAISE NOTICE 'PayHero integration tables created with tenant isolation.';
  RAISE NOTICE 'Ready for M-Pesa payments, pledge campaigns, and payroll.';
END $$;
