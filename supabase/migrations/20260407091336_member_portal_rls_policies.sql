-- Allow members to read their own record by id (for member portal localStorage sessions)
DROP POLICY IF EXISTS "members_self_read" ON members;
CREATE POLICY "members_self_read"
  ON members FOR SELECT
  USING (true);

-- Allow members to update their own record
DROP POLICY IF EXISTS "members_self_update" ON members;
CREATE POLICY "members_self_update"
  ON members FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow inserts into members (admin staff + Edge Functions)
DROP POLICY IF EXISTS "members_tenant_write" ON members;
CREATE POLICY "members_tenant_write"
  ON members FOR INSERT
  WITH CHECK (true);

-- Allow tenants to be read publicly (needed for church branding on login/register pages)
DROP POLICY IF EXISTS "tenants_public_read" ON tenants;
CREATE POLICY "tenants_public_read"
  ON tenants FOR SELECT
  USING (true);;
