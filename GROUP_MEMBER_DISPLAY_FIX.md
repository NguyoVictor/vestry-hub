# Group Member Display Fix - Member Portal

## Problem
The member portal was showing "Members (0)" for groups that actually have members on the admin side. The Hekima group shows 2 members (Victor Nguyo, Kayden Ngari) on the admin side but 0 members on the member portal.

## Root Cause
The issue was in the member portal queries in `src/pages/member/MemberGroups.tsx`:

1. **Query filtering issue**: The queries were filtering `group_members` table by `tenant_id` directly, but this column might not be properly populated in existing data.

2. **Missing tenant validation**: The queries weren't ensuring that group members belonged to the correct tenant through proper joins.

## Solution
Updated both queries in `MemberGroups.tsx` to use proper joins through the `groups` table:

### 1. All Group Members Query (for member counts)
**Before:**
```typescript
const { data: gm } = await supabase.from(TABLES.GROUP_MEMBERS)
  .select("group_id, member_id").eq(COLS.TENANT_ID, member.churchId);
```

**After:**
```typescript
const { data: gm } = await supabase.from(TABLES.GROUP_MEMBERS)
  .select(`
    group_id, 
    member_id,
    groups!inner(${COLS.TENANT_ID})
  `)
  .eq("groups.tenant_id", member.churchId);
```

### 2. Specific Group Members Query (for group detail page)
**Before:**
```typescript
const { data } = await supabase.from(TABLES.GROUP_MEMBERS)
  .select("member_id, members(id, first_name, last_name, avatar_url)")
  .eq("group_id", groupId!);
```

**After:**
```typescript
const { data } = await supabase.from(TABLES.GROUP_MEMBERS)
  .select(`
    member_id, 
    members(id, first_name, last_name, avatar_url),
    groups!inner(${COLS.TENANT_ID})
  `)
  .eq("group_id", groupId!)
  .eq("groups.tenant_id", member.churchId);
```

## Key Changes
1. **Inner join with groups table**: Uses `groups!inner(tenant_id)` to ensure only group members from the correct tenant are returned
2. **Proper tenant filtering**: Filters by `groups.tenant_id` instead of relying on `group_members.tenant_id`
3. **Security improvement**: Ensures member portal users can only see group members from their own church

## Additional Fix (Optional)
Created `FIX_GROUP_MEMBERS_TENANT_ID.sql` to populate the `tenant_id` column in the `group_members` table for existing data:

```sql
UPDATE group_members 
SET tenant_id = g.tenant_id
FROM groups g
WHERE group_members.group_id = g.id 
AND group_members.tenant_id IS NULL;
```

## Testing
1. ✅ Development server starts successfully
2. ✅ No TypeScript compilation errors
3. ✅ Queries use proper joins and tenant filtering

## Expected Result
- Member portal should now show correct member counts for groups
- Group detail pages should display all members properly
- Hekima group should show "Members (2)" instead of "Members (0)"
- Member list should display Victor Nguyo and Kayden Ngari

## Files Modified
- `src/pages/member/MemberGroups.tsx` - Fixed both group member queries