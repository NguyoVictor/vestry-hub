-- Debug script to check admin member creation
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'auto_create_member')
ORDER BY trigger_name;

-- 2. Check if functions exist
SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'create_member_for_user')
ORDER BY routine_name;

-- 3. Check your user record (replace with your actual email)
SELECT 
  id,
  tenant_id,
  email,
  first_name,
  last_name,
  role,
  status,
  avatar_url,
  created_at
FROM users 
WHERE role = 'super_admin'
ORDER BY created_at DESC;

-- 4. Check if member record exists for your user
SELECT 
  u.id as user_id,
  u.email,
  u.first_name as user_first_name,
  u.last_name as user_last_name,
  u.role,
  m.id as member_id,
  m.user_id as member_user_id,
  m.first_name as member_first_name,
  m.last_name as member_last_name,
  m.membership_number,
  m.member_type,
  m.registration_source,
  m.created_at as member_created_at
FROM users u
LEFT JOIN members m ON u.id = m.user_id
WHERE u.role = 'super_admin'
ORDER BY u.created_at DESC;

-- 5. Check all members in your tenant
SELECT 
  id,
  tenant_id,
  user_id,
  first_name,
  last_name,
  email,
  membership_number,
  member_type,
  registration_source,
  created_at
FROM members 
WHERE tenant_id = (
  SELECT tenant_id FROM users WHERE role = 'super_admin' LIMIT 1
)
ORDER BY created_at DESC;

-- 6. Check if there are any members without user_id (manually created)
SELECT 
  id,
  first_name,
  last_name,
  email,
  user_id,
  registration_source,
  member_type,
  created_at
FROM members 
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 10;