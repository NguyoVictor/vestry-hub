
-- =====================================================
-- PHASE 9: SAVED REPORTS AND PRAYER REQUESTS
-- =====================================================

-- =====================================================
-- 1. SAVED REPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  data_source TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  last_run TIMESTAMPTZ,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- Remove existing policy before recreating it
DROP POLICY IF EXISTS "Admins can manage saved reports"
ON saved_reports;

CREATE POLICY "Admins can manage saved reports"
ON saved_reports
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM users
    WHERE id = auth.uid()::text
  )
);

-- Index for tenant-specific report queries
CREATE INDEX IF NOT EXISTS idx_saved_reports_tenant
ON saved_reports(tenant_id);


-- =====================================================
-- 2. PRAYER REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS prayer_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  member_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  request TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_answered BOOLEAN DEFAULT false,
  answered_notes TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'answered', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- Remove existing member policy before recreating it
DROP POLICY IF EXISTS "Members can manage their own prayer requests"
ON prayer_requests;

CREATE POLICY "Members can manage their own prayer requests"
ON prayer_requests
FOR ALL
USING (
  member_id = auth.uid()::text
);

-- Remove existing staff policy before recreating it
DROP POLICY IF EXISTS "Staff can view all prayer requests"
ON prayer_requests;

CREATE POLICY "Staff can view all prayer requests"
ON prayer_requests
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM users
    WHERE id = auth.uid()::text
  )
);

-- Indexes for efficient tenant and member queries
CREATE INDEX IF NOT EXISTS idx_prayer_requests_tenant
ON prayer_requests(tenant_id);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_member
ON prayer_requests(member_id);
