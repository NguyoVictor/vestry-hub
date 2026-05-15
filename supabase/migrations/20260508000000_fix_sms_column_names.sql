-- Fix SMS column names to match frontend expectations
-- The frontend expects 'sender_id' but the database has 'at_sender_id'

-- Fix sms_settings table
ALTER TABLE sms_settings 
  RENAME COLUMN at_sender_id TO sender_id;

-- Fix tenants table  
ALTER TABLE tenants
  RENAME COLUMN at_sender_id TO sender_id;

-- Update schema comments
COMMENT ON COLUMN sms_settings.sender_id IS 'Africa''s Talking sender ID (shortcode or approved sender name)';
COMMENT ON COLUMN tenants.sender_id IS 'Africa''s Talking sender ID for notifications';