CREATE TABLE IF NOT EXISTS feature_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  feature TEXT NOT NULL,
  role TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'none' CHECK (access_level IN ('full','read','none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, feature, role)
);

CREATE INDEX IF NOT EXISTS idx_feature_permissions_tenant ON feature_permissions(tenant_id);

ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_tenant" ON feature_permissions
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );

CREATE OR REPLACE FUNCTION update_feature_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_permissions_updated_at
  BEFORE UPDATE ON feature_permissions
  FOR EACH ROW EXECUTE FUNCTION update_feature_permissions_updated_at();;
