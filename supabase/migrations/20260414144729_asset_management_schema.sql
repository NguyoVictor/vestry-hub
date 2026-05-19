-- Extend church_assets with missing columns
ALTER TABLE church_assets
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC DEFAULT 10;
-- Extend asset_maintenance with missing columns
ALTER TABLE asset_maintenance
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR,
  ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS completed_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- Create asset_release_requests table
CREATE TABLE IF NOT EXISTS asset_release_requests (
  id VARCHAR PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  asset_id VARCHAR NOT NULL REFERENCES church_assets(id),
  requested_by VARCHAR NOT NULL,
  purpose TEXT,
  date_needed DATE,
  return_date DATE,
  status VARCHAR DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_release_requests_tenant_id ON asset_release_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_church_assets_tenant_id ON church_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_tenant_id ON asset_maintenance(tenant_id);
-- RLS for asset_release_requests
ALTER TABLE asset_release_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can manage release requests"
  ON asset_release_requests FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
-- asset-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated users can upload asset images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'asset-images');
CREATE POLICY "Public can read asset images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'asset-images');
CREATE POLICY "Authenticated users can delete asset images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'asset-images');
