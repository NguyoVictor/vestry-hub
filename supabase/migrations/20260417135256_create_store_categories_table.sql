CREATE TABLE IF NOT EXISTS store_categories (
  id VARCHAR PRIMARY KEY DEFAULT 'scat_' || substr(md5(random()::text), 1, 12),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_tenant_id ON store_categories(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_tenant_slug ON store_categories(tenant_id, slug);

ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_store_categories" ON store_categories
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));;
