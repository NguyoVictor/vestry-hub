# 🚀 Quick Fix Reference — 2 Minutes to Working Member Portal

## The Problem
Member outreach page shows 400 errors because RLS policies don't allow member access.

## The Solution (2 SQL queries)

### 1️⃣ Fix RLS Policies (Copy & Paste This)
```sql
DROP POLICY IF EXISTS "outreach_tenant_rls" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_admin_access" ON outreach_activities;
DROP POLICY IF EXISTS "outreach_activities_member_select" ON outreach_activities;

CREATE POLICY "outreach_activities_admin_all" ON outreach_activities
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

CREATE POLICY "outreach_activities_member_read" ON outreach_activities
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
```

### 2️⃣ Create Photo Bucket (Copy & Paste This)
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('outreach-photos', 'outreach-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload outreach photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'outreach-photos');
CREATE POLICY "Authenticated users can view outreach photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'outreach-photos');
CREATE POLICY "Authenticated users can delete outreach photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'outreach-photos');
CREATE POLICY "Authenticated users can update outreach photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'outreach-photos');
```

## Where to Run
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Paste query 1, click **Run**
4. Paste query 2, click **Run**
5. Go to **Settings → API → Reload schema**
6. Hard refresh browser (`Ctrl+Shift+R`)
7. Test at `localhost:8080/member/outreach`

## Expected Result
✅ No 400 errors  
✅ Stats display with animated counters  
✅ Recent activities show  
✅ Page loads smoothly  

## If Still Broken
Check `URGENT_ACTION_PLAN.md` for detailed troubleshooting.
