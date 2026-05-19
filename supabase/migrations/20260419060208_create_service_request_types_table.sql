CREATE TABLE IF NOT EXISTS service_request_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  internal_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, internal_name)
);
CREATE INDEX IF NOT EXISTS idx_srt_tenant ON service_request_types(tenant_id);
ALTER TABLE service_request_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srt_tenant" ON service_request_types
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );
CREATE OR REPLACE FUNCTION update_srt_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER srt_updated_at
  BEFORE UPDATE ON service_request_types
  FOR EACH ROW EXECUTE FUNCTION update_srt_updated_at();
