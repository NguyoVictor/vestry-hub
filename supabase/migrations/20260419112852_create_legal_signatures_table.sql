CREATE TABLE IF NOT EXISTS legal_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  agreement_key TEXT NOT NULL,
  agreement_name TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_title TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'typed',
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agreement_key)
);

CREATE INDEX IF NOT EXISTS idx_legal_signatures_tenant ON legal_signatures(tenant_id);

ALTER TABLE legal_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ls_tenant" ON legal_signatures
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );;
