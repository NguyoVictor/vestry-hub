# Access Control Bugs - Fix Guide

## Overview
Three bugs need to be fixed on the Settings → Access Control page:
1. Member Invite Code shows "Loading..." and "Failed to generate code"
2. Missing livestream_schedules table causing 404 errors
3. Verification after fixes

---

## 🔧 BUG 1: Member Invite Code Issues

### PART A: Missing Database Columns

**Problem:** The `tenants` table is missing `invite_code` and `invite_code_uses` columns.

**Fix Steps:**

1. **Run SQL in Supabase Dashboard:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `FIX_ACCESS_CONTROL_BUGS.sql` (or run this directly):

```sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_uses INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tenants_invite_code ON tenants(invite_code);
```

2. **Reload Supabase Schema Cache:**
   - Go to Supabase Dashboard → Settings → API
   - Click "Reload schema" button

### PART B: Edge Function Update

**Problem:** The Edge Function needs to update both `church_code` and `invite_code`.

**Fix Steps:**

1. **Edge Function Already Updated:** ✅
   - File: `supabase/functions/generate-church-code/index.ts`
   - Now updates both `church_code` and `invite_code` columns

2. **Redeploy the Edge Function:**

```bash
npx supabase functions deploy generate-church-code
```

---

## 🔧 BUG 2: Missing livestream_schedules Table

**Problem:** The `livestream_schedules` table doesn't exist in the database.

**Fix Steps:**

1. **Run SQL in Supabase Dashboard:**
   - The SQL is included in `FIX_ACCESS_CONTROL_BUGS.sql`
   - Or run the migration file that was already created:

```bash
# Option 1: Run the comprehensive fix SQL in Supabase Dashboard
# (Recommended - fastest)

# Option 2: Push migrations (if sync issues are resolved)
npx supabase db push
```

The table will be created with:
- All required columns (id, tenant_id, title, description, start_time, etc.)
- Proper indexes for performance
- Row Level Security (RLS) enabled
- RLS policies for member viewing and admin management

---

## ✅ BUG 3: Verification Steps

After applying all fixes:

### 1. Database Verification

Run these queries in Supabase SQL Editor:

```sql
-- Check tenants columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('church_code', 'invite_code', 'invite_code_uses');

-- Check livestream_schedules table exists
SELECT COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'livestream_schedules';
```

Expected results:
- 3 columns for tenants (church_code, invite_code, invite_code_uses)
- 11 columns for livestream_schedules

### 2. Frontend Verification

1. Go to `localhost:3080/settings/access-control`
2. Check the "Member Invite Code" section:
   - Should show an actual code (e.g., "HOPE-A3B7")
   - NOT "Loading..." or error messages
3. Click "Generate New Code" button:
   - Should generate a new code
   - Should show success toast
   - No error toasts
4. Open Browser Console (F12):
   - No 400 errors from `/tenants?select=...`
   - No 500 errors from `/functions/v1/generate-church-code`
   - No 404 errors from `/livestream_schedules`

### 3. Test the Invite Code

1. Copy the generated invite code
2. Go to member registration page
3. Enter the code - should work without errors

---

## 📁 Files Modified

### Created:
- `supabase/migrations/20260502000002_add_invite_code_columns_to_tenants.sql`
- `FIX_ACCESS_CONTROL_BUGS.sql` (comprehensive fix script)
- `ACCESS_CONTROL_BUGS_FIX_GUIDE.md` (this file)

### Updated:
- `supabase/functions/generate-church-code/index.ts` (now updates invite_code)

### Already Exists:
- `supabase/migrations/20260502000000_add_livestreaming_tables.sql` (livestream tables)

---

## 🚀 Quick Fix (Recommended)

**Fastest way to fix everything:**

1. **Run SQL in Supabase Dashboard:**
   ```sql
   -- Copy and paste the entire content of FIX_ACCESS_CONTROL_BUGS.sql
   ```

2. **Reload Schema:**
   - Supabase Dashboard → Settings → API → "Reload schema"

3. **Redeploy Edge Function:**
   ```bash
   npx supabase functions deploy generate-church-code
   ```

4. **Test:**
   - Go to Settings → Access Control
   - Verify invite code loads and generates correctly
   - Check browser console for no errors

---

## 🐛 Troubleshooting

### If invite code still shows "Loading..."
- Check browser console for specific error
- Verify columns exist: `SELECT * FROM tenants LIMIT 1;`
- Check Edge Function logs in Supabase Dashboard

### If livestream 404 persists
- Verify table exists: `SELECT * FROM livestream_schedules LIMIT 1;`
- Check RLS policies are enabled
- Reload schema cache

### If Edge Function fails
- Check Supabase Dashboard → Edge Functions → Logs
- Verify environment variables are set
- Redeploy the function

---

## ✨ Expected Behavior After Fix

1. **Access Control Page:**
   - Invite code displays immediately (e.g., "HOPE-A3B7")
   - "Generate New Code" button works
   - No console errors

2. **Member Registration:**
   - Invite codes work for member registration
   - Usage counter increments properly

3. **Livestreaming:**
   - No 404 errors in console
   - Livestreaming pages load without errors
   - Live indicator works in navigation

---

## 📝 Notes

- The `church_code` column already existed in the tenants table
- The `invite_code` and `invite_code_uses` columns were missing
- The livestream tables were created in migration but not applied to database
- All fixes maintain existing RLS policies and security patterns
