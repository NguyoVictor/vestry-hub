-- Fix member access to PayHero configuration in tenants table
-- This ensures members can read PayHero fields needed for donations

-- Drop existing policy and recreate to ensure it's working
DROP POLICY IF EXISTS "tenants_public_read" ON tenants;
-- Allow public read access to tenants table (including PayHero fields)
-- This is needed for member portal to check payment configuration
CREATE POLICY "tenants_public_read"
  ON tenants FOR SELECT
  USING (true);
-- Ensure RLS is enabled on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- Add specific policy for authenticated users (members) to access PayHero fields
DROP POLICY IF EXISTS "tenants_member_payhero_read" ON tenants;
CREATE POLICY "tenants_member_payhero_read"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);
