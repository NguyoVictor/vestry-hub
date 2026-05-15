-- Drop the overly restrictive update policy
DROP POLICY IF EXISTS "users_self_update" ON public.users;
-- New update policy: user can update their own row
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE TO authenticated
  USING ((id)::text = (auth.uid())::text)
  WITH CHECK ((id)::text = (auth.uid())::text);
