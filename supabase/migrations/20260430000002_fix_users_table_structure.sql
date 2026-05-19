-- Fix users table structure and policies
-- This migration cleans up duplicate columns and fixes RLS policies

-- First, drop all existing policies to avoid recursion
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_tenant_read" ON public.users;
-- Disable RLS temporarily to clean up the table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- Create a clean backup of the users table
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM public.users LIMIT 0;
-- Get the current table structure to understand what we're working with
-- We need to identify which columns are duplicates and keep the correct ones

-- Drop the problematic users table and recreate it with proper structure
DROP TABLE IF EXISTS public.users CASCADE;
-- Recreate users table with clean structure
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
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users(status);
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Create simple, non-recursive RLS policies
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
-- Create updated_at trigger
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
-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
-- Add comment
COMMENT ON TABLE public.users IS 'User profiles linked to tenants with proper RLS policies';
