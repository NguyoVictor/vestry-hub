-- Complete debug to understand the member portal group issue
-- Run this in Supabase SQL Editor

-- 1. Get the Hekima group details
SELECT 'HEKIMA GROUP DETAILS' as debug_step;
SELECT id, name, tenant_id, type, leader_id, is_active
FROM groups 
WHERE name ILIKE '%hekima%';

-- 2. Get all group members for Hekima
SELECT 'GROUP MEMBERS FOR HEKIMA' as debug_step;
SELECT gm.group_id, gm.member_id, gm.tenant_id as gm_tenant_id, g.tenant_id as group_tenant_id
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
WHERE g.name ILIKE '%hekima%';

-- 3. Get member details for those member_ids
SELECT 'MEMBER DETAILS' as debug_step;
SELECT m.id, m.first_name, m.last_name, m.tenant_id, m.email
FROM members m
WHERE m.id IN (
  SELECT gm.member_id 
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id
  WHERE g.name ILIKE '%hekima%'
);

-- 4. Test the exact query from MemberGroupDetail (simulated)
SELECT 'SIMULATED MEMBER PORTAL QUERY' as debug_step;
-- This simulates the query: groups!inner(tenant_id) with .eq("groups.tenant_id", member.churchId)
SELECT 
  gm.member_id,
  m.id, m.first_name, m.last_name, m.avatar_url,
  g.tenant_id as group_tenant_id
FROM group_members gm
INNER JOIN groups g ON g.id = gm.group_id
LEFT JOIN members m ON m.id = gm.member_id
WHERE gm.group_id = (SELECT id FROM groups WHERE name ILIKE '%hekima%' LIMIT 1)
  AND g.tenant_id = (SELECT tenant_id FROM groups WHERE name ILIKE '%hekima%' LIMIT 1);

-- 5. Check if there are any tenant_id mismatches
SELECT 'TENANT ID ANALYSIS' as debug_step;
SELECT 
  'groups' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  array_agg(DISTINCT tenant_id) as tenant_ids
FROM groups
UNION ALL
SELECT 
  'group_members' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  array_agg(DISTINCT tenant_id) as tenant_ids
FROM group_members
UNION ALL
SELECT 
  'members' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  array_agg(DISTINCT tenant_id) as tenant_ids
FROM members;