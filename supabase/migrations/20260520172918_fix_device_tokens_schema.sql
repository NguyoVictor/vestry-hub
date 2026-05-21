-- Fix device_tokens table schema to match TypeScript types
-- Add missing columns that are referenced in the types but don't exist in the table

-- Add missing columns if they don't exist
ALTER TABLE device_tokens 
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Update the RLS policy to ensure it's correct
DROP POLICY IF EXISTS "device_tokens_own" ON device_tokens;
CREATE POLICY "device_tokens_own" ON device_tokens 
  FOR ALL USING (user_id = auth.uid()::text);

-- Add comment to clarify table purpose
COMMENT ON TABLE device_tokens IS 'Stores FCM device tokens for push notifications';
COMMENT ON COLUMN device_tokens.last_used_at IS 'Last time this token was used for sending notifications';
COMMENT ON COLUMN device_tokens.user_agent IS 'Browser/device user agent string for debugging';