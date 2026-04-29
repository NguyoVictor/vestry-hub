-- Fix group_members table to populate tenant_id from groups table
-- This ensures the member portal can properly filter group members

-- Update group_members.tenant_id from the groups table
UPDATE group_members 
SET tenant_id = g.tenant_id
FROM groups g
WHERE group_members.group_id = g.id 
AND group_members.tenant_id IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_group_members,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id
FROM group_members;