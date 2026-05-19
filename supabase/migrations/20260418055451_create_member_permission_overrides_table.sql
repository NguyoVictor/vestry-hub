CREATE TABLE IF NOT EXISTS member_permission_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'default' CHECK (access_level IN ('default','full','read','none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, member_id, feature)
);
CREATE INDEX IF NOT EXISTS idx_mpo_tenant ON member_permission_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mpo_member ON member_permission_overrides(member_id);
ALTER TABLE member_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpo_tenant" ON member_permission_overrides
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );
CREATE OR REPLACE FUNCTION update_mpo_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER mpo_updated_at
  BEFORE UPDATE ON member_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION update_mpo_updated_at();
