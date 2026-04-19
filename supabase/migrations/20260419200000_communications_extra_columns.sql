-- Add extra columns to communications table for email history feature
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS recipient_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Index for fast tenant queries
CREATE INDEX IF NOT EXISTS idx_communications_tenant_id ON communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(tenant_id, status);
