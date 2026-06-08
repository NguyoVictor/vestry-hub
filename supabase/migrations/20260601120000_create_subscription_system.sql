-- Create billing_history FIRST
CREATE TABLE IF NOT EXISTS billing_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_type VARCHAR NOT NULL CHECK (transaction_type IN ('subscription', 'addon', 'upgrade', 'downgrade')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'KES',
  payment_method VARCHAR DEFAULT 'mpesa',
  payment_reference VARCHAR,
  payment_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  plan_purchased VARCHAR,
  addon_type VARCHAR,
  addon_quantity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Drop old policy names
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Users can update their tenant subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Users can view their tenant billing history" ON billing_history;

-- Drop new policy names (for idempotency)
DROP POLICY IF EXISTS "subscription_select" ON tenant_subscriptions;
DROP POLICY IF EXISTS "subscription_update" ON tenant_subscriptions;
DROP POLICY IF EXISTS "subscription_insert" ON tenant_subscriptions;
DROP POLICY IF EXISTS "billing_history_select" ON billing_history;
DROP POLICY IF EXISTS "billing_history_insert" ON billing_history;

-- Fixed RLS policies
CREATE POLICY "subscription_select" ON tenant_subscriptions
  FOR SELECT USING (
    (tenant_id)::text IN (
      SELECT (u.tenant_id)::text FROM users u 
      WHERE (u.id)::text = (auth.uid())::text
    )
  );

CREATE POLICY "subscription_update" ON tenant_subscriptions
  FOR UPDATE USING (
    (tenant_id)::text IN (
      SELECT (u.tenant_id)::text FROM users u 
      WHERE (u.id)::text = (auth.uid())::text
    )
  );

CREATE POLICY "subscription_insert" ON tenant_subscriptions
  FOR INSERT WITH CHECK (
    (tenant_id)::text IN (
      SELECT (u.tenant_id)::text FROM users u 
      WHERE (u.id)::text = (auth.uid())::text
    )
  );

CREATE POLICY "billing_history_select" ON billing_history
  FOR SELECT USING (
    (tenant_id)::text IN (
      SELECT (u.tenant_id)::text FROM users u 
      WHERE (u.id)::text = (auth.uid())::text
    )
  );

CREATE POLICY "billing_history_insert" ON billing_history
  FOR INSERT WITH CHECK (
    (tenant_id)::text IN (
      SELECT (u.tenant_id)::text FROM users u 
      WHERE (u.id)::text = (auth.uid())::text
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id 
  ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan 
  ON tenant_subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status 
  ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan_status 
  ON tenant_subscriptions(plan, status);

CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_id 
  ON billing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_created 
  ON billing_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_status 
  ON billing_history(tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_status 
  ON billing_history(payment_status);

-- Default subscription for existing tenants
INSERT INTO tenant_subscriptions (
  tenant_id, plan, member_limit, staff_limit, branch_limit,
  storage_limit_gb, sms_credits, email_credits, ai_credits
)
SELECT id::uuid, 'free', 100, 3, 1, 2, 0, 100, 0
FROM tenants
WHERE id::text NOT IN (
  SELECT tenant_id::text FROM tenant_subscriptions
)
ON CONFLICT DO NOTHING;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_billing_history_updated_at ON billing_history;
CREATE TRIGGER update_billing_history_updated_at
  BEFORE UPDATE ON billing_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();