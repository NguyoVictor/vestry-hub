-- Services
CREATE TABLE IF NOT EXISTS services (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id varchar REFERENCES branches(id),
  title varchar NOT NULL,
  service_type service_type_enum DEFAULT 'sunday',
  service_date date NOT NULL,
  start_time time,
  end_time time,
  location varchar,
  description text,
  is_recurring boolean DEFAULT false,
  recurrence_rule varchar,
  parent_service_id varchar REFERENCES services(id),
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Events
CREATE TABLE IF NOT EXISTS events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id varchar REFERENCES branches(id),
  title varchar NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location varchar,
  description text,
  capacity_limit int,
  registration_deadline date,
  is_published boolean DEFAULT false,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id),
  registered_at timestamptz DEFAULT now()
);
-- Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id varchar REFERENCES services(id),
  event_id varchar REFERENCES events(id),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  qr_code_token varchar UNIQUE DEFAULT gen_random_uuid()::text,
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id varchar NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id),
  status attendance_status_enum DEFAULT 'present',
  check_in_method checkin_method_enum DEFAULT 'manual',
  checked_in_at timestamptz DEFAULT now()
);
-- Volunteer Assignments
CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id varchar REFERENCES services(id),
  event_id varchar REFERENCES events(id),
  member_id varchar NOT NULL REFERENCES users(id),
  role_name varchar NOT NULL,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);
-- Member Requests
CREATE TABLE IF NOT EXISTS member_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id),
  request_type varchar NOT NULL,
  description text,
  status task_status_enum DEFAULT 'open',
  assigned_to varchar REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
-- Board Meetings
CREATE TABLE IF NOT EXISTS board_meetings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  meeting_date date NOT NULL,
  start_time time,
  location varchar,
  agenda text,
  minutes text,
  action_items jsonb,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Facility Bookings
CREATE TABLE IF NOT EXISTS facility_bookings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_name varchar NOT NULL,
  booked_by varchar REFERENCES users(id),
  booking_date date NOT NULL,
  start_time time,
  end_time time,
  purpose varchar,
  status task_status_enum DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  incident_type varchar NOT NULL,
  description text,
  persons_involved text,
  status incident_status_enum DEFAULT 'open',
  resolution_notes text,
  reported_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
