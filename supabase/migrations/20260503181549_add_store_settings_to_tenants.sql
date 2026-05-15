-- Add store_settings JSONB column to tenants table for shipping configuration
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS store_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN tenants.store_settings IS 'Store configuration including shipping options (pickup, delivery)';;
