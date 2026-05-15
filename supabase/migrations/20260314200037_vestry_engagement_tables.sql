-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  body text NOT NULL,
  target_audience announcement_audience_enum DEFAULT 'all',
  target_id varchar,
  publish_at timestamptz,
  expires_at timestamptz,
  is_pinned boolean DEFAULT false,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Communications (bulk email/SMS campaigns)
CREATE TABLE IF NOT EXISTS communications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel comm_channel_enum NOT NULL,
  subject varchar,
  body text NOT NULL,
  recipient_type comm_recipient_enum DEFAULT 'all',
  recipient_ids text[],
  status comm_status_enum DEFAULT 'draft',
  sent_count int DEFAULT 0,
  delivered_count int DEFAULT 0,
  opened_count int DEFAULT 0,
  bounced_count int DEFAULT 0,
  sent_at timestamptz,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Direct Messages
CREATE TABLE IF NOT EXISTS messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id varchar NOT NULL REFERENCES users(id),
  recipient_id varchar REFERENCES users(id),
  group_id varchar REFERENCES groups(id),
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  body text,
  type varchar,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- Testimonies
CREATE TABLE IF NOT EXISTS testimonies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id),
  title varchar NOT NULL,
  body text NOT NULL,
  is_approved boolean DEFAULT false,
  approved_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]',
  is_published boolean DEFAULT false,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
-- Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  survey_id varchar NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  member_id varchar REFERENCES users(id),
  responses jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz DEFAULT now()
);
-- Outreach Activities
CREATE TABLE IF NOT EXISTS outreach_activities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  activity_date date NOT NULL,
  location varchar,
  description text,
  beneficiary_count int DEFAULT 0,
  outcomes text,
  led_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
