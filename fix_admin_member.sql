-- Manual fix to create member record for admin user
-- Run this in Supabase SQL Editor if the automatic triggers didn't work

-- First, let's create the member record for the admin user
-- This will find the admin user and create a corresponding member record

INSERT INTO members (
  id, 
  tenant_id, 
  user_id, 
  first_name, 
  last_name, 
  email, 
  phone,
  status, 
  member_type, 
  registration_source, 
  avatar_url,
  join_date, 
  membership_number, 
  created_at, 
  updated_at
)
SELECT 
  u.id,                    -- Use same ID as user
  u.tenant_id,
  u.id,                    -- Link back to user
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.status,
  'member',
  'admin',
  u.avatar_url,
  u.join_date,
  'MEM-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)) || '-' || UPPER(SUBSTRING(u.id::TEXT, 1, 4)),
  NOW(),
  NOW()
FROM users u
WHERE u.role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM members m WHERE m.user_id = u.id
  );

-- Verify the fix worked
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  m.membership_number,
  m.member_type,
  m.registration_source,
  m.created_at
FROM users u
JOIN members m ON u.id = m.user_id
WHERE u.role = 'super_admin';