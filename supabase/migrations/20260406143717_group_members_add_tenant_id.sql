-- group_members: code inserts tenant_id but table doesn't have it

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR,
  ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_group_members_tenant_id ON group_members(tenant_id);;
