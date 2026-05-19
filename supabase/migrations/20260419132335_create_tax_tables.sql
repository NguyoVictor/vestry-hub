-- Tax settings per tenant
CREATE TABLE IF NOT EXISTS tax_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL UNIQUE,
  registration_type TEXT,
  registration_type_other TEXT,
  registration_number TEXT,
  legal_org_name TEXT,
  tax_address TEXT,
  tax_city TEXT,
  tax_state TEXT,
  tax_postal_code TEXT,
  tax_country TEXT,
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 1,
  fiscal_year_start_day INTEGER NOT NULL DEFAULT 1,
  signature_name TEXT,
  signature_title TEXT,
  statement_header TEXT,
  receipt_footer TEXT,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts_tenant" ON tax_settings FOR ALL TO authenticated
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
-- Deductible giving types
CREATE TABLE IF NOT EXISTS tax_deductible_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  type_name TEXT NOT NULL,
  is_deductible BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, type_name)
);
CREATE INDEX IF NOT EXISTS idx_tdt_tenant ON tax_deductible_types(tenant_id);
ALTER TABLE tax_deductible_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tdt_tenant" ON tax_deductible_types FOR ALL TO authenticated
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
-- Generated tax statements
CREATE TABLE IF NOT EXISTS tax_statements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_giving NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductible_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  non_deductible_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  statement_data JSONB,
  status TEXT NOT NULL DEFAULT 'generated',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (tenant_id, member_id, year)
);
CREATE INDEX IF NOT EXISTS idx_tax_statements_tenant ON tax_statements(tenant_id);
ALTER TABLE tax_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txs_tenant" ON tax_statements FOR ALL TO authenticated
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
