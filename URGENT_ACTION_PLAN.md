# 🚨 URGENT ACTION PLAN — Fix Member Outreach Page

## Current Status
The member outreach page at `/member/outreach` is showing **400 errors** because RLS policies on `outreach_activities` table only check the `users` table, but member portal users authenticate via the `members` table.

---

## ⚡ IMMEDIATE ACTIONS (Do These Now)

### Step 1: Fix RLS Policies (URGENT)
**Run this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- =====================================================
-- URGENT FIX - RUN THIS NOW
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_admin_access" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_member_select" ON outreach_activities;

-- Create new policies that work for both admin and members
CREATE POLICY "outreach_activities_admin_all" ON outreach_activities
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1)
  );

CREATE POLICY "outreach_activities_member_read" ON outreach_activities
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation
FROM pg_policies
WHERE tablename = 'outreach_activities'
ORDER BY policyname;
```

**Expected Output:**
```
outreach_activities_admin_all      | ALL
outreach_activities_member_read    | SELECT
```

---

### Step 2: Create Photo Storage Bucket
**Run this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- Create outreach-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'outreach-photos',
  'outreach-photos',
  false,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for photo bucket
CREATE POLICY "Authenticated users can upload outreach photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'outreach-photos');

CREATE POLICY "Authenticated users can view outreach photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'outreach-photos');

CREATE POLICY "Authenticated users can delete outreach photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'outreach-photos');

CREATE POLICY "Authenticated users can update outreach photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'outreach-photos');
```

---

### Step 3: Reload Schema Cache
1. Go to **Supabase Dashboard → Settings → API**
2. Click **"Reload schema"** button
3. Wait for confirmation

---

### Step 4: Clear Browser Cache & Test
1. **Hard refresh browser**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Navigate to `localhost:8080/member/outreach`
3. Open browser console (F12)
4. Check for errors - should see NO 400 errors
5. Verify page loads with stats and activities

---

## 🧪 Testing Checklist

### Member Portal Side (Priority)
- [ ] Navigate to `/member/outreach`
- [ ] Verify NO 400 errors in console
- [ ] Verify stats display (Total Activities, People Reached, Salvations, Volunteer Hours)
- [ ] Verify number counters animate on load
- [ ] Verify recent activities section shows (if activities exist)
- [ ] Verify upcoming activities section shows (if planned activities exist)
- [ ] Verify year in review card displays
- [ ] Test empty state (if no activities)
- [ ] Test in dark mode
- [ ] Test on mobile viewport

### Admin Side (Secondary)
- [ ] Navigate to `/outreach`
- [ ] Create new activity with `follow_up_required = true` and `follow_up_count > 0`
- [ ] Verify follow-up task created (check toast notification)
- [ ] Upload 1-5 photos to an activity
- [ ] Verify photos appear in preview grid
- [ ] Remove a photo from preview
- [ ] Submit form and verify photos uploaded
- [ ] Click photo to open lightbox
- [ ] Navigate between photos in lightbox
- [ ] Close lightbox by clicking outside
- [ ] Verify orange accent color throughout
- [ ] Test in dark mode

---

## 🐛 Troubleshooting

### Still getting 400 errors?
1. **Verify policies exist:**
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'outreach_activities';
   ```
2. **Check member has tenant_id:**
   ```sql
   SELECT id, tenant_id FROM members WHERE id = auth.uid()::text;
   ```
3. **Reload schema cache** (Settings → API → Reload schema)
4. **Clear browser cache** (Ctrl+Shift+R)

### Photos not uploading?
1. **Verify bucket exists:**
   ```sql
   SELECT id, name FROM storage.buckets WHERE id = 'outreach-photos';
   ```
2. **Check storage policies:**
   ```sql
   SELECT policyname FROM storage.policies WHERE bucket_id = 'outreach-photos';
   ```
3. **Test upload in Supabase Storage UI**

### Empty page but no errors?
This is expected if:
- No outreach activities exist for this church
- All activities have status other than 'completed'
- Activities exist but are from a different tenant

---

## 📦 Files Ready for Commit

### Created:
1. `src/pages/member/MemberOutreach.tsx` — Complete member outreach page
2. `supabase/migrations/20260502202934_outreach_photos_bucket.sql` — Photo storage
3. `supabase/migrations/20260502210000_fix_outreach_activities_member_access.sql` — RLS fix
4. `RUN_THIS_NOW.sql` — Urgent RLS fix
5. `FIX_MEMBER_OUTREACH_ACCESS.sql` — Detailed RLS fix
6. `MEMBER_OUTREACH_FIX_GUIDE.md` — Troubleshooting guide
7. `OUTREACH_UPGRADE_COMPLETE.md` — Complete documentation
8. `URGENT_ACTION_PLAN.md` — This file

### Modified:
1. `src/pages/growth/Outreach.tsx` — Photo upload, lightbox, follow-up automation
2. `src/App.tsx` — Member outreach route
3. `src/pages/member/MemberHome.tsx` — Updated outreach card path

---

## 🎯 Success Criteria

✅ Member outreach page loads without errors  
✅ Stats display correctly with animated counters  
✅ Recent activities show with photos (if exist)  
✅ Upcoming activities show (if exist)  
✅ Year in review displays  
✅ Admin can upload photos  
✅ Photos display in lightbox  
✅ Follow-up tasks auto-create  
✅ Orange accent color throughout  
✅ Dark mode works on both sides  

---

## 📝 Commit Message (After Testing)

```bash
git add .
git commit -m "feat: upgrade outreach & impact with photos and member portal

Admin side:
- Add follow-up task automation
- Add photo upload (max 5, 5MB each)
- Add photo lightbox viewer
- Apply orange accent color (#ea580c)
- Add colored activity type chips
- Improve table formatting

Member side:
- Create member outreach page at /member/outreach
- Add animated stat counters
- Add recent activities feed with photos
- Add upcoming activities section
- Add year in review summary
- Full dark mode support

Database:
- Create outreach-photos storage bucket
- Fix RLS policies for member portal access
- Add policies for both users and members tables

Files:
- src/pages/growth/Outreach.tsx (enhanced)
- src/pages/member/MemberOutreach.tsx (new)
- src/pages/member/MemberHome.tsx (route update)
- src/App.tsx (route wiring)
- supabase/migrations/20260502202934_outreach_photos_bucket.sql
- supabase/migrations/20260502210000_fix_outreach_activities_member_access.sql
"
```

---

**Status**: ⚠️ WAITING FOR DATABASE FIXES  
**Next Action**: Run SQL in Steps 1 & 2 above  
**ETA to Complete**: 5 minutes after database fixes applied
