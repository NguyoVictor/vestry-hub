-- Create members rows for all users who don't have one yet
INSERT INTO members (
  id, tenant_id, first_name, last_name, email, phone,
  status, member_type, registration_source,
  join_date, membership_number, created_at, updated_at
)
SELECT
  u.id,
  u.tenant_id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  CASE WHEN u.status = 'active' THEN 'active' ELSE 'inactive' END,
  'member',
  'admin',
  COALESCE(u.join_date, CURRENT_DATE),
  'MEM-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)) || '-' || UPPER(SUBSTRING(u.id::TEXT, 1, 4)),
  NOW(),
  NOW()
FROM users u
LEFT JOIN members m ON m.id = u.id
WHERE m.id IS NULL;
-- Verify
SELECT COUNT(*) as total_members FROM members;
