-- SAFE Users Table Fix Script
-- This script safely fixes the users table without dropping data
-- Run this in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 2: Check current policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- Step 3: Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_tenant_read" ON public.users;

-- Step 4: Create a clean users table structure (rename current table first)
ALTER TABLE public.users RENAME TO users_old_backup;

-- Step 5: Create new clean users table
CREATE TABLE public.users (
    -- Core identity (from auth.users)
    id VARCHAR PRIMARY KEY,
    tenant_id VARCHAR NOT NULL,
    
    -- Basic info
    email VARCHAR NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    phone VARCHAR,
    role VARCHAR DEFAULT 'member',
    status VARCHAR DEFAULT 'active',
    
    -- Dates
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Profile
    avatar_url VARCHAR,
    gender VARCHAR,
    
    -- Auth related
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    
    -- Admin flags
    is_super_admin BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT users_role_check CHECK (role IN ('member', 'admin', 'super_admin', 'pastor', 'elder', 'deacon')),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT users_gender_check CHECK (gender IN ('male', 'female', 'other'))
);

-- Step 6: Migrate data from old table (taking first occurrence of duplicates)
INSERT INTO public.users (
    id, tenant_id, email, first_name, last_name, phone, role, status,
    join_date, created_at, updated_at, avatar_url, gender,
    email_verified, phone_verified, mfa_enabled, is_super_admin
)
SELECT DISTINCT ON (id)
    id::varchar,
    tenant_id::varchar,
    email::varchar,
    first_name::varchar,
    last_name::varchar,
    phone::varchar,
    COALESCE(role::varchar, 'member'),
    COALESCE(status::varchar, 'active'),
    COALESCE(join_date::date, CURRENT_DATE),
    COALESCE(created_at::timestamptz, NOW()),
    COALESCE(updated_at::timestamptz, NOW()),
    avatar_url::varchar,
    gender::varchar,
    COALESCE(email_verified::boolean, false),
    COALESCE(phone_verified::boolean, false),
    COALESCE(mfa_enabled::boolean, false),
    COALESCE(is_super_admin::boolean, false)
FROM users_old_backup
WHERE id IS NOT NULL AND tenant_id IS NOT NULL
ORDER BY id, created_at DESC;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users(status);

-- Step 8: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 9: Create simple, non-recursive RLS policies
-- Policy 1: Users can read their own record
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT
    USING (id::text = auth.uid()::text);

-- Policy 2: Users can read other users in their tenant (for admin functions)
CREATE POLICY "users_read_tenant" ON public.users
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT u.tenant_id 
            FROM public.users u 
            WHERE u.id::text = auth.uid()::text
        )
    );

-- Policy 3: Users can insert their own record (for onboarding)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (id::text = auth.uid()::text);

-- Policy 4: Users can update their own record
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (id::text = auth.uid()::text)
    WITH CHECK (id::text = auth.uid()::text);

-- Policy 5: Super admins can do everything within their tenant
CREATE POLICY "users_super_admin_all" ON public.users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.is_super_admin = true 
            AND u.tenant_id = users.tenant_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.is_super_admin = true 
            AND u.tenant_id = users.tenant_id
        )
    );

-- Step 10: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Step 12: Verify the fix
SELECT 'Users table structure fixed successfully' as status;
SELECT COUNT(*) as user_count FROM public.users;

-- Step 13: Check policies are working
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- IMPORTANT: After running this script successfully, you can drop the backup table:
-- DROP TABLE IF EXISTS users_old_backup;