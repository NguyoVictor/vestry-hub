
-- Add missing columns to existing tables
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS follow_up_status varchar DEFAULT 'not_contacted';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS assigned_to varchar;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS follow_up_due_date date;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS service_attended varchar;

ALTER TABLE members ADD COLUMN IF NOT EXISTS secondary_phone varchar;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nationality varchar;
ALTER TABLE members ADD COLUMN IF NOT EXISTS id_number varchar;
ALTER TABLE members ADD COLUMN IF NOT EXISTS department varchar;
ALTER TABLE members ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE members ADD COLUMN IF NOT EXISTS baptized boolean DEFAULT false;

ALTER TABLE new_converts ADD COLUMN IF NOT EXISTS mentor_id varchar;
ALTER TABLE new_converts ADD COLUMN IF NOT EXISTS baptism_status varchar DEFAULT 'not_baptized';
ALTER TABLE new_converts ADD COLUMN IF NOT EXISTS baptism_date date;
ALTER TABLE new_converts ADD COLUMN IF NOT EXISTS graduated_at timestamptz;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS color varchar DEFAULT '#4F46E5';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS meeting_day varchar;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS meeting_time varchar;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS meeting_location varchar;

-- Create house_fellowships table
CREATE TABLE IF NOT EXISTS house_fellowships (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL,
  name varchar NOT NULL,
  zone varchar,
  host_name varchar,
  host_address text,
  leader_id varchar,
  meeting_day varchar,
  meeting_time varchar,
  max_capacity integer,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE house_fellowships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hf_tenant_rls" ON house_fellowships FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

-- Create fellowship_members table
CREATE TABLE IF NOT EXISTS fellowship_members (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  fellowship_id varchar NOT NULL REFERENCES house_fellowships(id) ON DELETE CASCADE,
  member_id varchar NOT NULL,
  tenant_id varchar NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(fellowship_id, member_id)
);
ALTER TABLE fellowship_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fm_tenant_rls" ON fellowship_members FOR ALL USING ((tenant_id)::text = (get_my_tenant_id())::text);

-- Create family_members join table
CREATE TABLE IF NOT EXISTS family_members (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  family_id varchar NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id varchar NOT NULL,
  relationship varchar NOT NULL DEFAULT 'other',
  UNIQUE(family_id, member_id)
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fam_members_rls" ON family_members FOR ALL USING (
  (family_id)::text IN (SELECT id FROM families WHERE (tenant_id)::text = (get_my_tenant_id())::text)
);

-- Create visitor_followup_notes
CREATE TABLE IF NOT EXISTS visitor_followup_notes (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  visitor_id varchar NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  note text NOT NULL,
  status_at_time varchar,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE visitor_followup_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vfn_tenant_rls" ON visitor_followup_notes FOR ALL USING (
  (visitor_id)::text IN (SELECT id FROM visitors WHERE (tenant_id)::text = (get_my_tenant_id())::text)
);

-- Create convert_checkins
CREATE TABLE IF NOT EXISTS convert_checkins (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  convert_id varchar NOT NULL REFERENCES new_converts(id) ON DELETE CASCADE,
  notes text,
  conducted_by varchar,
  checkin_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE convert_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_tenant_rls" ON convert_checkins FOR ALL USING (
  (convert_id)::text IN (SELECT id FROM new_converts WHERE (tenant_id)::text = (get_my_tenant_id())::text)
);

-- Create convert_stage_history
CREATE TABLE IF NOT EXISTS convert_stage_history (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  convert_id varchar NOT NULL REFERENCES new_converts(id) ON DELETE CASCADE,
  from_stage integer,
  to_stage integer NOT NULL,
  notes text,
  advanced_by varchar,
  advanced_at timestamptz DEFAULT now()
);
ALTER TABLE convert_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csh_tenant_rls" ON convert_stage_history FOR ALL USING (
  (convert_id)::text IN (SELECT id FROM new_converts WHERE (tenant_id)::text = (get_my_tenant_id())::text)
);
