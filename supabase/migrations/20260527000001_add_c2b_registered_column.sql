-- Add c2b_registered column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS c2b_registered boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN tenants.c2b_registered IS 'Whether C2B URLs have been registered with Safaricom for direct M-Pesa payments';