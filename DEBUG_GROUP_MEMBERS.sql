-- Debug query to understand the group members data structure
-- Let's check the Hekima group specifically

-- 1. Find the Hekima group
SELECT id, name, tenant_id, type, leader_id 
FROM groups 
WHERE name ILIKE '%hekima%';

-- 2. Check group_members for Hekima group
SELECT gm.*, g.name as group_name, g.tenant_id as group_tenant_id
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
WHERE g.name ILIKE '%hekima%';

-- 3. Check if members exist in members table
SELECT m.id, m.first_name, m.last_name, m.tenant_id
FROM members m
WHERE m.id IN (
  SELECT gm.member_id 
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id
  WHERE g.name ILIKE '%hekima%'
);

-- 4. Full join to see the complete picture
SELECT 
  g.name as group_name,
  g.id as group_id,
  g.tenant_id as group_tenant_id,
  gm.member_id,
  gm.tenant_id as gm_tenant_id,
  m.first_name,
  m.last_name,
  m.tenant_id as member_tenant_id
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN members m ON gm.member_id = m.id
WHERE g.name ILIKE '%hekima%';