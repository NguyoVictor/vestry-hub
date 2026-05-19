-- Create resource_categories table
CREATE TABLE IF NOT EXISTS resource_categories (
  id VARCHAR PRIMARY KEY DEFAULT 'rc_' || substr(md5(random()::text), 1, 12),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON resource_categories
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_resource_categories_tenant_id ON resource_categories(tenant_id);
-- Add new columns to discipleship_resources
ALTER TABLE discipleship_resources
  ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS category_id VARCHAR REFERENCES resource_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS lesson_content TEXT,
  ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
-- Backfill resource_type from existing type column
UPDATE discipleship_resources
  SET resource_type = CASE
    WHEN type = 'pdf' THEN 'document'
    WHEN type = 'video' THEN 'video'
    WHEN type = 'audio' THEN 'document'
    WHEN type = 'document' THEN 'document'
    WHEN type = 'external_link' THEN 'link'
    ELSE 'document'
  END
  WHERE resource_type IS NULL OR resource_type = 'document';
