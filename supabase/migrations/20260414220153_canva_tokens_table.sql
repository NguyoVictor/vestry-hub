CREATE TABLE IF NOT EXISTS canva_tokens (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id),
  user_id varchar NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_canva_tokens_tenant_id ON canva_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_canva_tokens_user_id ON canva_tokens(user_id);
ALTER TABLE canva_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY canva_tokens_tenant_isolation ON canva_tokens
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
-- Table for short-lived PKCE state storage
CREATE TABLE IF NOT EXISTS canva_oauth_state (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  state varchar NOT NULL UNIQUE,
  code_verifier text NOT NULL,
  tenant_id varchar NOT NULL,
  user_id varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 minutes')
);
CREATE INDEX IF NOT EXISTS idx_canva_oauth_state_state ON canva_oauth_state(state);
