-- Store Products
CREATE TABLE IF NOT EXISTS store_products (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  description TEXT,
  image_urls JSONB DEFAULT '[]',
  product_type TEXT DEFAULT 'physical' CHECK (product_type IN ('physical','digital')),
  price DECIMAL(12,2) NOT NULL,
  compare_at_price DECIMAL(12,2),
  currency TEXT DEFAULT 'KES',
  sku TEXT,
  stock_quantity INT DEFAULT 0,
  weight_kg DECIMAL(5,2),
  digital_file_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','draft','out_of_stock')),
  sales_count INT DEFAULT 0,
  tags TEXT[],
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage products" ON store_products FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE POLICY "Members can view active products" ON store_products FOR SELECT
  USING (status = 'active' AND tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON store_products(tenant_id);

-- Store Orders
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;
CREATE TABLE IF NOT EXISTS store_orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL DEFAULT '',
  customer_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_method TEXT DEFAULT 'pickup' CHECK (delivery_method IN ('digital_download','pickup','delivery')),
  delivery_address TEXT,
  subtotal DECIMAL(12,2) NOT NULL,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  payment_method TEXT,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending','processing','fulfilled','picked_up','delivered','cancelled','refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage orders" ON store_orders FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON store_orders(tenant_id);

CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number = '' OR NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_order_number ON store_orders;
CREATE TRIGGER set_order_number BEFORE INSERT ON store_orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR REFERENCES store_orders(id) ON DELETE CASCADE NOT NULL,
  product_id VARCHAR REFERENCES store_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  digital_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage order items" ON order_items FOR ALL
  USING (order_id IN (SELECT id FROM store_orders WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text)));
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);;
