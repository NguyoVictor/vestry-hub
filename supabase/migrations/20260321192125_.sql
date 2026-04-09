-- Phase 5: Events & Operations

-- Add columns to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS type varchar DEFAULT 'other';
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_image_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_type varchar DEFAULT 'on_site';
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name varchar;
ALTER TABLE events ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS online_link text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_rsvp boolean DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id varchar;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'published';
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_on_public_page boolean DEFAULT true;
-- Add columns to board_meetings
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS type varchar DEFAULT 'board_meeting';
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS location_type varchar DEFAULT 'on_site';
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS venue varchar;
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS online_link text;
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_content text;
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_document_url text;
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS pre_meeting_notes text;
ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'scheduled';
-- Add columns to member_requests
ALTER TABLE member_requests ADD COLUMN IF NOT EXISTS title varchar;
ALTER TABLE member_requests ADD COLUMN IF NOT EXISTS priority varchar DEFAULT 'medium';
ALTER TABLE member_requests ADD COLUMN IF NOT EXISTS is_confidential boolean DEFAULT false;
ALTER TABLE member_requests ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE member_requests ADD COLUMN IF NOT EXISTS resolution_notes text;
ALTER TABLE member_requests ADD COLUMN IF NOT EXISTS resolved_by varchar;
-- Add columns to facility_bookings
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS facility_id varchar;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS booking_reference varchar;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS expected_attendees integer;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS setup_required boolean DEFAULT false;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS setup_notes text;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS equipment_needed text[];
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS approved_by varchar;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS approved_at timestamptz;
-- Create volunteer_roles table
CREATE TABLE IF NOT EXISTS volunteer_roles (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  department varchar,
  description text,
  required_skills text[],
  min_volunteers integer DEFAULT 1,
  max_volunteers integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS volunteer_roles_tenant_rls ON volunteer_roles;
CREATE POLICY volunteer_roles_tenant_rls ON volunteer_roles FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
-- Create volunteers (assignments) table
CREATE TABLE IF NOT EXISTS volunteers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar NOT NULL,
  role_id varchar REFERENCES volunteer_roles(id) ON DELETE SET NULL,
  reference_type varchar CHECK (reference_type IN ('event','service')),
  reference_id varchar,
  status varchar DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','completed','no_show')),
  hours_served numeric(5,2) DEFAULT 0,
  notes text,
  assigned_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS volunteers_tenant_rls ON volunteers;
CREATE POLICY volunteers_tenant_rls ON volunteers FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
-- Create event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id varchar NOT NULL,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar,
  name text,
  phone varchar,
  email varchar,
  status varchar DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','cancelled')),
  rsvp_source varchar DEFAULT 'admin' CHECK (rsvp_source IN ('admin','self','public_form')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_rsvps_tenant_rls ON event_rsvps;
CREATE POLICY event_rsvps_tenant_rls ON event_rsvps FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type varchar DEFAULT 'other',
  capacity integer,
  description text,
  amenities text[],
  photo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS facilities_tenant_rls ON facilities;
CREATE POLICY facilities_tenant_rls ON facilities FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
-- Create member_request_notes table
CREATE TABLE IF NOT EXISTS member_request_notes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id varchar NOT NULL,
  note text NOT NULL,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE member_request_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mrn_tenant_rls ON member_request_notes;
CREATE POLICY mrn_tenant_rls ON member_request_notes FOR ALL USING (
  request_id::text IN (SELECT id FROM member_requests WHERE tenant_id::text = get_my_tenant_id()::text)
);
-- Create meeting_attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id varchar NOT NULL,
  member_id varchar NOT NULL,
  attendance_status varchar DEFAULT 'expected',
  UNIQUE(meeting_id, member_id)
);
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ma_tenant_rls ON meeting_attendees;
CREATE POLICY ma_tenant_rls ON meeting_attendees FOR ALL USING (
  meeting_id::text IN (SELECT id FROM board_meetings WHERE tenant_id::text = get_my_tenant_id()::text)
);
-- Create meeting_action_items table
CREATE TABLE IF NOT EXISTS meeting_action_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id varchar NOT NULL,
  description text NOT NULL,
  assigned_to varchar,
  due_date date,
  status varchar DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mai_tenant_rls ON meeting_action_items;
CREATE POLICY mai_tenant_rls ON meeting_action_items FOR ALL USING (
  meeting_id::text IN (SELECT id FROM board_meetings WHERE tenant_id::text = get_my_tenant_id()::text)
);
