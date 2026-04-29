-- Check group_members table structure and data for Hekima group
SELECT 
  gm.group_id,
  gm.member_id,
  gm.tenant_id,
  g.name as group_name,
  m.first_name,
  m.last_name
FROM group_members gm
LEFT JOIN groups g ON g.id = gm.group_id
LEFT JOIN members m ON m.id = gm.member_id
WHERE g.name ILIKE '%hekima%'
ORDER BY gm.group_id, gm.member_id;

-- Check if tenant_id is properly set in group_members
SELECT 
  COUNT(*) as total_group_members,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id
FROM group_members;

-- Check groups table for Hekima group
SELECT id, name, tenant_id, type, leader_id, is_active
FROM groups 
WHERE name ILIKE '%hekima%';