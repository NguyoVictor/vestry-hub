-- Fix FINAL DESTINATION tenant PayHero configuration
-- This migration updates the PayHero settings for the FINAL DESTINATION tenant

UPDATE tenants 
SET 
  payhero_channel_id = '8577',
  payhero_connected = true,
  payhero_channel_type = 'till',
  updated_at = now()
WHERE id = 'c698f0db-8e29-4fb6-9e06-9d647b4a6493'
  AND name = 'FINAL DESTINATION';
-- Verify the update
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  SELECT payhero_connected, payhero_channel_id, payhero_channel_type, name
  INTO tenant_record
  FROM tenants 
  WHERE id = 'c698f0db-8e29-4fb6-9e06-9d647b4a6493';
  
  IF tenant_record.payhero_connected = true AND tenant_record.payhero_channel_id = '8577' THEN
    RAISE NOTICE 'SUCCESS: FINAL DESTINATION PayHero configuration updated successfully';
    RAISE NOTICE 'Channel ID: %, Connected: %, Type: %', 
      tenant_record.payhero_channel_id, 
      tenant_record.payhero_connected, 
      tenant_record.payhero_channel_type;
  ELSE
    RAISE EXCEPTION 'FAILED: PayHero configuration was not updated correctly';
  END IF;
END $$;
