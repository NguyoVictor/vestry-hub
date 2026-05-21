-- Fix payhero_channel_id column type from integer to varchar
-- PayHero channel IDs can be strings, not just integers

ALTER TABLE tenants 
  ALTER COLUMN payhero_channel_id TYPE varchar(100);

-- Add comment to clarify the column purpose
COMMENT ON COLUMN tenants.payhero_channel_id IS 'PayHero channel ID - can be string or numeric, supports temporary IDs during manual setup';