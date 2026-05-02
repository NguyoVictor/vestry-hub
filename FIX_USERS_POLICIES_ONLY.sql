-- MINIMAL FIX: Just fix the RLS policies to stop recursion
-- This is the safest approach - only fixes policies, doesn't touch table structure

-- Step 1: Drop the problematic recursive policies
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;  
DROP POLICY IF EXISTS "users_tenant_read" ON public.users;

-- Step 2: Create simple, non-recursive policies
-- Policy 1: Users can read their own record (direct auth.uid() check)
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

-- Step 3: Verify policies are working
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

SELECT 'RLS policies fixed - recursion should be resolved' as status;