CREATE TABLE IF NOT EXISTS user_fine_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'default' CHECK (level IN ('default','read_only','full_access')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_ufp_tenant ON user_fine_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ufp_user ON user_fine_permissions(user_id);

ALTER TABLE user_fine_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ufp_tenant" ON user_fine_permissions
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );;
