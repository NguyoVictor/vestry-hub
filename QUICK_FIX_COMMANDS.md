# Quick Fix Commands - Access Control Bugs

## 🚀 Run These Commands in Order

### Step 1: Fix Database (Run in Supabase SQL Editor)

```sql
-- Add missing columns to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_uses INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tenants_invite_code ON tenants(invite_code);

-- Create livestream_schedules table
CREATE TABLE IF NOT EXISTS livestream_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  recurrence_pattern TEXT,
  recurrence_day INTEGER,
  is_recurring BOOLEAN DEFAULT false,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livestream_schedules_tenant_live ON livestream_schedules (tenant_id, is_live);
CREATE INDEX IF NOT EXISTS idx_livestream_schedules_tenant_start ON livestream_schedules (tenant_id, start_time);

ALTER TABLE livestream_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "livestream_schedules_select" ON livestream_schedules;
CREATE POLICY "livestream_schedules_select" ON livestream_schedules 
  FOR SELECT TO authenticated 
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) 
    OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
  );

DROP POLICY IF EXISTS "livestream_schedules_insert" ON livestream_schedules;
CREATE POLICY "livestream_schedules_insert" ON livestream_schedules 
  FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

DROP POLICY IF EXISTS "livestream_schedules_update" ON livestream_schedules;
CREATE POLICY "livestream_schedules_update" ON livestream_schedules 
  FOR UPDATE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

DROP POLICY IF EXISTS "livestream_schedules_delete" ON livestream_schedules;
CREATE POLICY "livestream_schedules_delete" ON livestream_schedules 
  FOR DELETE TO authenticated 
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
```

### Step 2: Reload Schema Cache
- Go to Supabase Dashboard → Settings → API
- Click **"Reload schema"** button

### Step 3: Redeploy Edge Function (Run in terminal)

```bash
npx supabase functions deploy generate-church-code
```

### Step 4: Verify (Run in Supabase SQL Editor)

```sql
-- Should return 3 rows
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('church_code', 'invite_code', 'invite_code_uses');

-- Should return 11
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'livestream_schedules';
```

### Step 5: Test in Browser
1. Go to `localhost:3080/settings/access-control`
2. Verify invite code shows (not "Loading...")
3. Click "Generate New Code" - should work
4. Check console - no 400, 404, or 500 errors

## ✅ Done!
All three bugs should now be fixed.
