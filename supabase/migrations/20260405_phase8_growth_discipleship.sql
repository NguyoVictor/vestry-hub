-- ============================================================
-- PHASE 8: GROWTH & DISCIPLESHIP — DATABASE MIGRATIONS
-- Adapted for actual DB schema: tenant_id (VARCHAR), tenants table
-- ============================================================

-- DISCIPLESHIP RESOURCES TABLE
CREATE TABLE IF NOT EXISTS discipleship_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','video','audio','document','external_link')),
  file_url TEXT,
  external_url TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'other',
  recommended_stages INT[] DEFAULT '{1}',
  description TEXT,
  duration_label TEXT,
  tags TEXT[],
  is_downloadable BOOLEAN DEFAULT true,
  author TEXT,
  assignment_count INT DEFAULT 0,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE discipleship_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage discipleship resources" ON discipleship_resources FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_discipleship_resources_tenant ON discipleship_resources(tenant_id);

-- RESOURCE ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS resource_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  resource_id VARCHAR REFERENCES discipleship_resources(id) ON DELETE CASCADE NOT NULL,
  convert_id VARCHAR REFERENCES new_converts(id) ON DELETE CASCADE NOT NULL,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  assigned_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  completion_status TEXT DEFAULT 'not_started' CHECK (completion_status IN ('not_started','in_progress','completed')),
  completed_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, convert_id)
);
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage resource assignments" ON resource_assignments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_resource_assignments_tenant ON resource_assignments(tenant_id);

-- RESOURCE COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS resource_collections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  recommended_stage INT CHECK (recommended_stage BETWEEN 1 AND 4),
  cover_image_url TEXT,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE resource_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage collections" ON resource_collections FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_resource_collections_tenant ON resource_collections(tenant_id);

-- COLLECTION RESOURCES TABLE
CREATE TABLE IF NOT EXISTS collection_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  collection_id VARCHAR REFERENCES resource_collections(id) ON DELETE CASCADE NOT NULL,
  resource_id VARCHAR REFERENCES discipleship_resources(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL DEFAULT 0,
  UNIQUE(collection_id, resource_id)
);
ALTER TABLE collection_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage collection resources" ON collection_resources FOR ALL
  USING (collection_id IN (SELECT id FROM resource_collections WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text)));

-- STORE PRODUCTS TABLE
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;
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

-- STORE ORDERS TABLE
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

-- ORDER ITEMS TABLE
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
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- COURSE ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS course_enrollments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  UNIQUE(course_id, user_id)
);
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own enrollments" ON course_enrollments FOR ALL
  USING (user_id = auth.uid()::text);
CREATE POLICY "Admins can view all enrollments" ON course_enrollments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);

-- LESSON COMPLETIONS TABLE
CREATE TABLE IF NOT EXISTS lesson_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enrollment_id VARCHAR REFERENCES course_enrollments(id) ON DELETE CASCADE NOT NULL,
  course_id VARCHAR REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  module_index INT NOT NULL,
  lesson_index INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, module_index, lesson_index)
);
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own lesson completions" ON lesson_completions FOR ALL
  USING (enrollment_id IN (SELECT id FROM course_enrollments WHERE user_id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_lesson_completions_enrollment ON lesson_completions(enrollment_id);

-- COURSE COMMENTS TABLE
CREATE TABLE IF NOT EXISTS course_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE course_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled users can view and add comments" ON course_comments FOR ALL
  USING (course_id IN (SELECT course_id FROM course_enrollments WHERE user_id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_course_comments_course ON course_comments(course_id);
