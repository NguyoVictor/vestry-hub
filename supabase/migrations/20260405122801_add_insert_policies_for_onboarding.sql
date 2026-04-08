-- Allow authenticated users to insert their own tenant during onboarding
CREATE POLICY "tenant_self_insert" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to insert/upsert their own user row during onboarding
CREATE POLICY "users_self_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ((id)::text = (auth.uid())::text);;
