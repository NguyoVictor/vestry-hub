-- Drop the read policy that blocks new users with no tenant yet
DROP POLICY IF EXISTS "users_tenant_read" ON public.users;
-- New read policy: users can always read their own row regardless of tenant
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT TO authenticated
  USING ((id)::text = (auth.uid())::text);
-- Also allow reading other users in the same tenant (for existing users)
CREATE POLICY "users_tenant_read" ON public.users
  FOR SELECT TO authenticated
  USING (
    (id)::text = (auth.uid())::text
    OR (tenant_id IS NOT NULL AND (tenant_id)::text = (get_my_tenant_id())::text)
  );
-- Drop the old combined policy we just replaced
DROP POLICY IF EXISTS "users_self_read" ON public.users;
