-- Check current user and create member record
-- Run this in Supabase SQL Editor

-- 1. First, let's see what your current user record looks like
SELECT 
  id,
  tenant_id,
  email,
  first_name,
  last_name,
  role,
  status,
  avatar_url,
  join_date,
  created_at
FROM users 
WHERE role = 'super_admin'
ORDER BY created_at DESC;

-- 2. Check if you have any member record at all
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
  SELECT tenant_id FROM users WHERE role = 'super_admin' LIMIT 1
)
ORDER BY created_at DESC;

-- 3. Check what tenant you belong to
SELECT 
  t.id,
  t.name,
  t.church_code,
  u.email as admin_email
FROM tenants t
JOIN users u ON t.id = u.tenant_id
WHERE u.role = 'super_admin'
ORDER BY t.created_at DESC;