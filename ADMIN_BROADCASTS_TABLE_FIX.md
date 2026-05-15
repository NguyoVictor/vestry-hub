# Fix: Create Missing admin_broadcasts Table

## Problem
The error "Could not find the table 'public.admin_broadcasts' in the schema cache" occurs because the `admin_broadcasts` table doesn't exist in the database.

## Solution
Execute this SQL in your Supabase SQL Editor:

### Step 1: Go to Supabase Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your `vestry-hub` project
3. Go to **SQL Editor** in the left sidebar

### Step 2: Execute This SQL

```sql
-- Create admin_broadcasts table
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject varchar NOT NULL,
  message text NOT NULL,
  priority varchar DEFAULT 'normal',
  channels text[] DEFAULT ARRAY['in_app'],
  recipient_type varchar DEFAULT 'all',
  recipient_ids text[],
  total_recipients int DEFAULT 0,
  status varchar DEFAULT 'draft',
  email_sent_count int DEFAULT 0,
  email_failed_count int DEFAULT 0,
  push_sent_count int DEFAULT 0,
  push_failed_count int DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_tenant ON admin_broadcasts(tenant_id);

-- Enable Row Level Security
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "admin_broadcasts_tenant" ON admin_broadcasts;
CREATE POLICY "admin_broadcasts_tenant" ON admin_broadcasts 
FOR ALL USING (tenant_id = get_my_tenant_id());

-- Also create device_tokens table if missing
CREATE TABLE IF NOT EXISTS device_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_type varchar DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Create indexes for device_tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_tenant ON device_tokens(tenant_id);

-- Enable RLS for device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for device_tokens
DROP POLICY IF EXISTS "device_tokens_own" ON device_tokens;
CREATE POLICY "device_tokens_own" ON device_tokens 
FOR ALL USING (user_id = auth.uid()::text);

-- Create broadcast_templates table if missing
CREATE TABLE IF NOT EXISTS broadcast_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  subject varchar NOT NULL,
  message text NOT NULL,
  priority varchar DEFAULT 'normal',
  channels text[] DEFAULT ARRAY['in_app'],
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for broadcast_templates
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_tenant ON broadcast_templates(tenant_id);

-- Enable RLS for broadcast_templates
ALTER TABLE broadcast_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for broadcast_templates
DROP POLICY IF EXISTS "broadcast_templates_tenant" ON broadcast_templates;
CREATE POLICY "broadcast_templates_tenant" ON broadcast_templates 
FOR ALL USING (tenant_id = get_my_tenant_id());
```

### Step 3: Click "Run" Button

### Step 4: Verify Tables Created
After running the SQL, you should see:
- ✅ `admin_broadcasts` table created
- ✅ `device_tokens` table created  
- ✅ `broadcast_templates` table created
- ✅ All indexes and RLS policies applied

### Step 5: Test Push Notifications
1. Go back to **Communications → Admin Broadcast**
2. Try sending a push notification again
3. Should work without the table error!

## What These Tables Do

### `admin_broadcasts`
- Stores admin broadcast messages
- Tracks delivery counts (email, push)
- Supports scheduling and drafts

### `device_tokens` 
- Stores FCM tokens for push notifications
- Links users to their device tokens
- Enables push notification delivery

### `broadcast_templates`
- Stores reusable message templates
- Includes system and custom templates
- Speeds up broadcast creation

## After Creating Tables

Push notifications should work immediately:
1. **Admin Broadcasts** ✅ Send to all members
2. **Push Delivery** ✅ Notifications sent to devices  
3. **Delivery Tracking** ✅ See sent/failed counts
4. **Template System** ✅ Save and reuse messages

The tables are now ready for production use! 🚀