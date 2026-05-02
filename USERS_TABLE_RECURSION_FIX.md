# Users Table Recursion Fix

## Problem Summary

The users table has been experiencing infinite recursion errors during onboarding, preventing users from completing registration and accessing the dashboard.

### Root Cause

1. **Infinite Recursion Loop**: The `get_my_tenant_id()` function queries the `users` table, but the `users` table RLS policies also call `get_my_tenant_id()`, creating an infinite loop:
   ```
   get_my_tenant_id() → queries users table → triggers RLS policy → calls get_my_tenant_id() → infinite loop
   ```

2. **Duplicate Columns**: The users table has duplicate columns (`id`, `email`, `role`, `phone`, `created_at`, `updated_at`) causing schema cache issues.

3. **Navigation Issue**: After successful onboarding, AuthGuard gets `null` for user row and redirects back to onboarding instead of dashboard.

## Solutions Provided

### Option 1: Minimal Fix (Recommended)
**File**: `FIX_USERS_POLICIES_ONLY.sql`
- Only fixes the RLS policies to stop recursion
- Safest approach - doesn't touch table structure
- Removes recursive policies and creates simple direct auth.uid() checks

### Option 2: Complete Policy Fix
**File**: `FIX_RECURSION_COMPLETE.sql`
- Fixes recursion with a comprehensive approach
- Creates a safe helper function `get_my_tenant_id_safe()`
- Maintains compatibility with existing policies on other tables
- Recommended for production use

### Option 3: Full Table Restructure
**File**: `FIX_USERS_TABLE_SAFE.sql`
- Completely rebuilds the users table with clean structure
- Migrates data safely from old table
- Most comprehensive but also most invasive

## How to Apply the Fix

1. **Choose Option 2** (recommended): Run `FIX_RECURSION_COMPLETE.sql` in Supabase SQL Editor
2. Test onboarding flow
3. Verify AuthGuard navigation works correctly

## Expected Results After Fix

1. ✅ Onboarding completes without recursion errors
2. ✅ Users can insert/update their records
3. ✅ AuthGuard gets valid user data after registration
4. ✅ Users navigate to dashboard after successful onboarding
5. ✅ Super admins can manage users in their tenant

## Files Created

- `FIX_USERS_POLICIES_ONLY.sql` - Minimal policy fix
- `FIX_RECURSION_COMPLETE.sql` - Complete recursion fix (recommended)
- `FIX_USERS_TABLE_SAFE.sql` - Full table restructure
- `supabase/migrations/20260430000001_fix_users_table_structure.sql` - Migration version

## Next Steps

1. Run the chosen SQL script in Supabase SQL Editor
2. Test the onboarding flow with a new user
3. Verify dashboard navigation works
4. Monitor for any remaining issues

## Prevention

To prevent similar issues in the future:
- Avoid RLS policies that query the same table they're protecting
- Use direct `auth.uid()` checks when possible
- Test RLS policies thoroughly before deployment
- Use `SECURITY DEFINER` functions carefully to avoid recursion