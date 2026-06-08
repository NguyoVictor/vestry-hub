-- Fix RLS policy for automation_settings table to allow authenticated users

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Service role can manage automation settings" ON automation_settings;

-- Create a new policy that allows authenticated users to manage automation settings
CREATE POLICY "Authenticated users can manage automation settings" ON automation_settings
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- Also allow anon role for this specific use case (frontend configuration)
CREATE POLICY "Allow anon role for automation settings" ON automation_settings
  FOR ALL USING (auth.role() = 'anon');

-- Grant necessary permissions to anon and authenticated roles
GRANT ALL ON automation_settings TO anon;
GRANT ALL ON automation_settings TO authenticated;