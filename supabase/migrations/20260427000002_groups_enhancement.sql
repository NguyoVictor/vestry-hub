-- Groups enhancement: new columns, group_types table, join_requests table
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'onsite' CHECK (meeting_type IN ('online','onsite','hybrid')),
  ADD COLUMN IF NOT EXISTS jitsi_room_name TEXT,
  ADD COLUMN IF NOT EXISTS max_members INTEGER,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public','private')),
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS cover_color TEXT,
  ADD COLUMN IF NOT EXISTS meeting_day TEXT,
  ADD COLUMN IF NOT EXISTS meeting_time TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE TABLE IF NOT EXISTS group_types (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_types_tenant_id ON group_types(tenant_id);
ALTER TABLE group_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS join_requests (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_join_requests_group_id ON join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_member_id ON join_requests(member_id);
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
