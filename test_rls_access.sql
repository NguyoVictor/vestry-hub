-- Test RLS access for members table
-- Run this to check if there are permission issues

-- 1. Check RLS policies on members table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'members';

-- 2. Test if you can see members as the current user
-- This simulates what the frontend query does
SELECT 
    id,
    tenant_id,
    user_id,
    first_name,
    last_name,
    email,
    member_type,
    registration_source,
    created_at
FROM members 
WHERE tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()::text
)
ORDER BY created_at DESC;

-- 3. Check what auth.uid() returns (should be your user ID)
SELECT 
    auth.uid() as current_auth_uid,
    auth.role() as current_auth_role;

-- 4. Check get_my_tenant_id() function
SELECT get_my_tenant_id() as my_tenant_id;

-- 5. Check if your user record exists and is accessible
SELECT 
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    role,
    status
FROM users 
WHERE id = auth.uid()::text;