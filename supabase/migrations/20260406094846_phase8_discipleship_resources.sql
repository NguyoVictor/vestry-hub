-- Discipleship Resources
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
-- Resource Assignments
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
-- Resource Collections
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
-- Collection Resources
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
