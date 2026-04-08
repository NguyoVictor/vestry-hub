-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  location varchar,
  pastor_id varchar REFERENCES users(id),
  contact_email varchar,
  contact_phone varchar,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  description text,
  type group_type_enum DEFAULT 'other',
  leader_id varchar REFERENCES users(id),
  meeting_schedule varchar,
  last_meeting_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  group_id varchar NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);;
