ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_uses INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_invite_code ON tenants(invite_code) WHERE invite_code IS NOT NULL;
