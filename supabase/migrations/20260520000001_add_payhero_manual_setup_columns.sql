-- =====================================================
-- PAYHERO MANUAL SETUP TRACKING COLUMNS
-- =====================================================
-- Add columns to track manual PayHero setup process

-- Add manual setup tracking columns to tenants
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS payhero_manual_setup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payhero_setup_details jsonb,
  ADD COLUMN IF NOT EXISTS payhero_business_name varchar(255);
-- Update existing records to have proper defaults
UPDATE tenants 
SET payhero_manual_setup = false 
WHERE payhero_manual_setup IS NULL;
-- Add comment for documentation
COMMENT ON COLUMN tenants.payhero_manual_setup IS 'Indicates if PayHero channel requires manual setup in PayHero dashboard';
COMMENT ON COLUMN tenants.payhero_setup_details IS 'JSON object containing setup details for manual PayHero configuration';
COMMENT ON COLUMN tenants.payhero_business_name IS 'Business name used for PayHero channel setup';
-- Success message
DO $$
BEGIN
  RAISE NOTICE 'PayHero manual setup tracking columns added successfully!';
  RAISE NOTICE 'Tenants can now track manual setup progress.';
END $$;
