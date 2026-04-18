CREATE TABLE IF NOT EXISTS user_role_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_overrides_tenant ON user_role_overrides(tenant_id);

ALTER TABLE user_role_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uro_tenant" ON user_role_overrides
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );

CREATE OR REPLACE FUNCTION update_user_role_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_role_overrides_updated_at
  BEFORE UPDATE ON user_role_overrides
  FOR EACH ROW EXECUTE FUNCTION update_user_role_overrides_updated_at();;
