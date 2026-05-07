-- Verification script to check if auto member creation is working
-- Run this after creating a new admin account

-- 1. Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'auto_create_member');

-- 2. Check if functions exist
SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'create_member_for_user');

-- 3. Check recent user-member relationships
-- Replace 'your-email@example.com' with the test email
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.avatar_url,
  u.role,
  m.id as member_id,
  m.user_id as member_user_id,
  m.membership_number,
  m.member_type,
  m.registration_source,
  m.created_at
FROM users u
LEFT JOIN members m ON u.id = m.user_id
WHERE u.email = 'your-email@example.com'  -- Replace with test email
ORDER BY u.created_at DESC;

-- 4. Check if member appears in members table
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
  avatar_url,
  created_at
FROM members 
WHERE registration_source = 'admin'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verify tenant creation for new admin
SELECT 
  t.id,
  t.name,
  t.church_code,
  t.onboarding_completed,
  u.email as admin_email,
  u.role
FROM tenants t
JOIN users u ON t.id = u.tenant_id
WHERE u.role = 'super_admin'
ORDER BY t.created_at DESC
LIMIT 5;