-- Add missing invite code columns to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_uses INTEGER NOT NULL DEFAULT 0;
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_invite_code ON tenants(invite_code);
