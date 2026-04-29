-- Test the exact queries that the member portal should be running
-- Using the actual Hekima group ID and tenant ID from the debug results

-- 1. Test the group detail query (what should work in MemberGroupDetail)
SELECT 'GROUP DETAIL QUERY TEST' as test_name;
SELECT 
  gm.member_id,
  m.id, m.first_name, m.last_name, m.avatar_url
FROM group_members gm
INNER JOIN members m ON m.id = gm.member_id
WHERE gm.group_id = '5848d398-3e7d-44a9-a0ac-db33c088425f'
  AND m.tenant_id = '34126643-2d36-4888-9062-24c89dc61612';

-- 2. Test the all group members query (what should work for member counts)
SELECT 'ALL GROUP MEMBERS QUERY TEST' as test_name;
SELECT 
  gm.group_id,
  gm.member_id,
  m.id, m.first_name, m.last_name
FROM group_members gm
INNER JOIN members m ON m.id = gm.member_id
INNER JOIN groups g ON g.id = gm.group_id
WHERE m.tenant_id = '34126643-2d36-4888-9062-24c89dc61612'
  AND g.tenant_id = '34126643-2d36-4888-9062-24c89dc61612';

-- 3. Check if there are any RLS policy issues by testing as different users
SELECT 'RLS POLICY CHECK' as test_name;
SELECT current_user, current_setting('app.current_tenant_id', true) as current_tenant;