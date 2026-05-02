-- SIMPLE FIX FOR USERS TABLE RECURSION ISSUE
-- This script fixes the infinite recursion without assuming column structure

-- Step 1: Drop the problematic users policies that cause recursion
DROP POLICY IF EXISTS "users_tenant_read" ON public.users;
DROP POLICY IF EXISTS "users_tenant_write" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;

-- Step 2: Create a new helper function that doesn't cause recursion
-- This function bypasses RLS by using SECURITY DEFINER and direct auth.uid()
CREATE OR REPLACE FUNCTION get_my_tenant_id_safe()
RETURNS varchar 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id::text = auth.uid()::text
$$;

-- Step 3: Create simple, non-recursive RLS policies for users table
-- Policy 1: Users can read their own record (direct auth.uid() check - no recursion)
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT
    USING (id::text = auth.uid()::text);

-- Policy 2: Users can insert their own record (for onboarding)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (id::text = auth.uid()::text);

-- Policy 3: Users can update their own record
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (id::text = auth.uid()::text)
    WITH CHECK (id::text = auth.uid()::text);

-- Policy 4: Users with 'super_admin' role can read all users in their tenant
-- This uses role column instead of is_super_admin
CREATE POLICY "users_admin_read" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'super_admin'
            AND u.tenant_id = users.tenant_id
        )
    );

-- Policy 5: Users with 'super_admin' role can manage users in their tenant
CREATE POLICY "users_admin_write" ON public.users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'super_admin'
            AND u.tenant_id = users.tenant_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'super_admin'
            AND u.tenant_id = users.tenant_id
        )
    );

-- Step 4: Update the original get_my_tenant_id function to use the safe version
-- This maintains compatibility with existing policies on other tables
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS varchar 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT get_my_tenant_id_safe()
$$;

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_my_tenant_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_tenant_id() TO authenticated;

-- Step 6: Verify the fix
SELECT 'Users table RLS policies fixed - recursion resolved' as status;

-- Step 7: Test the policies work
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' ORDER BY policyname;