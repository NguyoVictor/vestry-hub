-- Create canva_tokens table for storing Canva OAuth tokens
-- This table stores access and refresh tokens for Canva API integration

CREATE TABLE IF NOT EXISTS canva_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  canva_user_id varchar NOT NULL,
  canva_user_name varchar,
  canva_user_email varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one Canva connection per tenant
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE canva_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies - scoped to tenant_id
CREATE POLICY "Users can view their tenant's Canva tokens" ON canva_tokens
  FOR SELECT USING (
    tenant_id IN (
      SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert Canva tokens for their tenant" ON canva_tokens
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their tenant's Canva tokens" ON canva_tokens
  FOR UPDATE USING (
    tenant_id IN (
      SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete their tenant's Canva tokens" ON canva_tokens
  FOR DELETE USING (
    tenant_id IN (
      SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()::text
    )
  );

-- Create index for performance
CREATE INDEX idx_canva_tokens_tenant_id ON canva_tokens(tenant_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_canva_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canva_tokens_updated_at
  BEFORE UPDATE ON canva_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_canva_tokens_updated_at();