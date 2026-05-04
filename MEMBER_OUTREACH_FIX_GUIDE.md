# Member Outreach Page Fix Guide

## Problem

The member outreach page at `/member/outreach` shows "Could not load outreach data" with 400 errors because:

1. **RLS Policy Issue**: The existing RLS policy on `outreach_activities` only checks the `users` table, but member portal users authenticate via the `members` table
2. **Column Names**: Queries were using `SELECT *` which can cause issues

## Solution

### Step 1: Fix RLS Policies

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_member_select" ON outreach_activities;

-- Policy for admin users (users table)
CREATE POLICY "outreach_activities_admin_access" ON outreach_activities
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- Policy for member portal users (members table) - SELECT only
CREATE POLICY "outreach_activities_member_select" ON outreach_activities
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
```

### Step 2: Verify Policies

```sql
-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'outreach_activities';
```

Expected output: 2 policies
- `outreach_activities_admin_access` (FOR ALL)
- `outreach_activities_member_select` (FOR SELECT)

### Step 3: Test Query

```sql
-- This should return activities (run as authenticated user)
SELECT id, name, activity_date, status 
FROM outreach_activities 
WHERE status = 'completed' 
ORDER BY activity_date DESC 
LIMIT 5;
```

### Step 4: Reload Schema Cache

1. Go to **Supabase Dashboard → Settings → API**
2. Click **"Reload schema"** button

### Step 5: Test in Browser

1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Navigate to `localhost:8080/member/outreach`
3. Check browser console (F12) - should see no 400 errors
4. Page should load with stats and activities

## What Was Fixed

### Code Changes

**File**: `src/pages/member/MemberOutreach.tsx`

**Before**:
```typescript
.select("*")
```

**After**:
```typescript
.select("id, name, type, activity_date, location, description, target_community, people_reached, salvations, volunteer_ids, report, photo_urls, start_time, end_time, status")
```

### Database Changes

**File**: `supabase/migrations/20260502210000_fix_outreach_activities_member_access.sql`

- Created separate policies for admin users and member users
- Admin users: Full access (SELECT, INSERT, UPDATE, DELETE)
- Member users: Read-only access (SELECT)

## Schema Reference

The `outreach_activities` table has these columns:

**Original columns**:
- `id` (varchar, primary key)
- `tenant_id` (varchar, not null)
- `title` (varchar, not null) - **NOT USED**
- `activity_date` (date, not null)
- `location` (varchar)
- `description` (text)
- `beneficiary_count` (int)
- `outcomes` (text)
- `led_by` (varchar)
- `created_at` (timestamptz)

**Added columns**:
- `name` (varchar) - **USED INSTEAD OF title**
- `type` (varchar)
- `start_time` (time)
- `end_time` (time)
- `target_community` (varchar)
- `people_reached` (integer)
- `salvations` (integer)
- `visitors_captured` (integer)
- `materials_distributed` (text)
- `volunteer_ids` (jsonb)
- `team_leader_id` (varchar)
- `status` (varchar)
- `report` (text)
- `follow_up_required` (boolean)
- `follow_up_count` (integer)
- `photo_urls` (jsonb)
- `created_by` (varchar)
- `updated_at` (timestamptz)

## Troubleshooting

### Still getting 400 errors?

1. **Check you ran the SQL**: Verify policies exist in Supabase Dashboard
2. **Reload schema**: Settings → API → Reload schema
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check auth**: Make sure you're logged in as a member
5. **Check tenant_id**: Verify member has a tenant_id in members table

### Still showing "Could not load outreach data"?

1. **Check if activities exist**: Run query in SQL Editor
2. **Check member's tenant_id**: 
   ```sql
   SELECT id, tenant_id FROM members WHERE id = auth.uid()::text;
   ```
3. **Check activities for that tenant**:
   ```sql
   SELECT * FROM outreach_activities WHERE tenant_id = 'YOUR_TENANT_ID';
   ```

### Empty page but no errors?

This is expected if:
- No outreach activities exist for this church
- All activities have status other than 'completed'
- Activities exist but are from a different tenant

## Files Modified

1. `src/pages/member/MemberOutreach.tsx` - Fixed queries
2. `supabase/migrations/20260502210000_fix_outreach_activities_member_access.sql` - New migration
3. `FIX_MEMBER_OUTREACH_ACCESS.sql` - SQL to run in dashboard
4. `MEMBER_OUTREACH_FIX_GUIDE.md` - This guide

## Next Steps

After fixing:
1. Test with real data
2. Test in both light and dark mode
3. Test on mobile viewport
4. Create commit with all changes
