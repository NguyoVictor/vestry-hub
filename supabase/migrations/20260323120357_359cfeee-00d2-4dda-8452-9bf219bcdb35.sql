-- Fix 1: Harden users_self_update to prevent role/status/tenant_id changes
DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users
  FOR UPDATE TO authenticated
  USING (
    (id)::text = (auth.uid())::text
    AND (tenant_id)::text = (get_my_tenant_id())::text
  )
  WITH CHECK (
    (id)::text = (auth.uid())::text
    AND (tenant_id)::text = (get_my_tenant_id())::text
    AND role = (SELECT u.role FROM public.users u WHERE u.id::text = auth.uid()::text)
    AND status = (SELECT u.status FROM public.users u WHERE u.id::text = auth.uid()::text)
    AND tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id::text = auth.uid()::text)
  );

-- Fix 2: Replace broad expenses policy with granular policies
DROP POLICY IF EXISTS expenses_tenant_rls ON public.expenses;

CREATE POLICY expenses_tenant_select ON public.expenses
  FOR SELECT TO authenticated
  USING ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE POLICY expenses_tenant_insert ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK ((tenant_id)::text = (get_my_tenant_id())::text);

CREATE POLICY expenses_admin_update ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    (tenant_id)::text = (get_my_tenant_id())::text
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text
      AND role IN ('super_admin', 'staff_leader')
    )
  );

CREATE POLICY expenses_admin_delete ON public.expenses
  FOR DELETE TO authenticated
  USING (
    (tenant_id)::text = (get_my_tenant_id())::text
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text
      AND role IN ('super_admin', 'staff_leader')
    )
  );