BEGIN;

-- Add missing onboarding fields.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS country VARCHAR,
  ADD COLUMN IF NOT EXISTS tenant_metadata JSONB
    NOT NULL DEFAULT '{}'::jsonb;

-- Remove recursive policies.
DROP POLICY IF EXISTS users_read_tenant
ON public.users;

DROP POLICY IF EXISTS users_super_admin_all
ON public.users;

-- Restore tenant-wide read access using the existing
-- SECURITY DEFINER helper, avoiding recursive RLS.
CREATE POLICY users_read_tenant
ON public.users
FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT private.get_staff_tenant_id())
);

COMMIT;