-- Add additional contact fields to tenants table for email placeholders
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Add comment explaining these fields
COMMENT ON COLUMN tenants.address IS 'Church physical address for email templates';
COMMENT ON COLUMN tenants.phone IS 'Church phone number for email templates';
COMMENT ON COLUMN tenants.website IS 'Church website URL for email templates';