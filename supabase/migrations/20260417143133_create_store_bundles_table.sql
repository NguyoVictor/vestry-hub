CREATE TABLE IF NOT EXISTS store_bundles (
  id VARCHAR PRIMARY KEY DEFAULT 'bndl_' || substr(md5(random()::text), 1, 12),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  product_ids TEXT[] DEFAULT '{}',
  original_price NUMERIC(10,2) DEFAULT 0,
  bundle_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  member_discount NUMERIC(5,2) DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sales_count INTEGER DEFAULT 0,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_bundles_tenant_id ON store_bundles(tenant_id);
ALTER TABLE store_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_store_bundles" ON store_bundles
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
