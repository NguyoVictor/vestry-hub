CREATE TABLE IF NOT EXISTS store_coupons (
  id VARCHAR PRIMARY KEY DEFAULT 'coup_' || substr(md5(random()::text), 1, 12),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_coupons_tenant_code ON store_coupons(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_store_coupons_tenant_id ON store_coupons(tenant_id);

ALTER TABLE store_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_store_coupons" ON store_coupons
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));;
