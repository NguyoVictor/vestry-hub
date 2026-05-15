-- Create group_types table if it doesn't exist
-- Run this SQL directly in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS group_types (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#7c3aed',
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_types_tenant_id ON group_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_types_sort_order ON group_types(tenant_id, sort_order);

-- Enable Row Level Security
ALTER TABLE group_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "group_types_tenant_access" ON group_types;
CREATE POLICY "group_types_tenant_access" ON group_types
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- Insert default group types for existing tenants
INSERT INTO group_types (tenant_id, label, color, description, sort_order, is_active)
SELECT 
  t.id as tenant_id,
  d.label,
  d.color,
  d.description,
  d.sort_order,
  true as is_active
FROM tenants t
CROSS JOIN (
  VALUES 
    ('Ministry', '#7c3aed', 'General ministry group', 0),
    ('Cell Group', '#10b981', 'Small home cell group', 1),
    ('Department', '#3b82f6', 'Church department or team', 2),
    ('Choir', '#f59e0b', 'Music and worship choir', 3),
    ('Youth', '#f43f5e', 'Youth ministry group', 4),
    ('Children', '#f97316', 'Children ministry group', 5),
    ('Other', '#94a3b8', 'Other group type', 6)
) AS d(label, color, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM group_types gt 
  WHERE gt.tenant_id = t.id AND gt.label = d.label
);

-- Verify the table was created and populated
SELECT 
  t.name as church_name,
  COUNT(gt.id) as group_types_count
FROM tenants t
LEFT JOIN group_types gt ON gt.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;