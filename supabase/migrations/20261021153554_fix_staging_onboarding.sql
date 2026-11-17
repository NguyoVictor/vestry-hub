-- RECOVERED FROM ALREADY-APPLIED SUPABASE MIGRATION HISTORY. DO NOT RUN DIRECTLY ON STAGING.
BEGIN;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS country VARCHAR, ADD COLUMN IF NOT EXISTS tenant_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
DROP POLICY IF EXISTS users_read_tenant ON public.users;
DROP POLICY IF EXISTS users_super_admin_all ON public.users;
CREATE POLICY users_read_tenant ON public.users FOR SELECT TO authenticated USING (tenant_id = (SELECT private.get_staff_tenant_id()));
COMMIT;
