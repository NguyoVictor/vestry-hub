-- Discipleship Pathways
CREATE TABLE IF NOT EXISTS discipleship_pathways (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  stages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Sermons
CREATE TABLE IF NOT EXISTS sermons (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  preacher_id varchar REFERENCES users(id),
  sermon_date date,
  series varchar,
  scripture_reference varchar,
  notes text,
  audio_url varchar,
  video_url varchar,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Song Library
CREATE TABLE IF NOT EXISTS songs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  artist varchar,
  lyrics text,
  chords text,
  key varchar,
  tempo int,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- Church Assets
CREATE TABLE IF NOT EXISTS church_assets (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  category varchar,
  serial_number varchar,
  location varchar,
  condition varchar DEFAULT 'good',
  purchase_date date,
  purchase_value numeric(12,2),
  assigned_to varchar REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Resources Store
CREATE TABLE IF NOT EXISTS resources (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  description text,
  category varchar,
  file_url varchar,
  is_public boolean DEFAULT false,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Training Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  description text,
  modules jsonb DEFAULT '[]',
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Training Enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id varchar NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  member_id varchar NOT NULL REFERENCES users(id),
  progress int DEFAULT 0,
  completed_at timestamptz,
  enrolled_at timestamptz DEFAULT now()
);

-- Onboarding Progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  current_step int DEFAULT 0,
  steps_completed jsonb DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_name varchar NOT NULL,
  module varchar NOT NULL,
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  UNIQUE (tenant_id, role_name, module)
);

-- Integration Settings
CREATE TABLE IF NOT EXISTS integration_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider integration_provider_enum NOT NULL,
  credentials jsonb,
  is_active boolean DEFAULT false,
  last_tested_at timestamptz,
  test_status test_status_enum DEFAULT 'untested',
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

-- Email Quota Tracking
CREATE TABLE IF NOT EXISTS email_quotas (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lifetime_sent int DEFAULT 0,
  monthly_sent int DEFAULT 0,
  quota_reset_at timestamptz DEFAULT date_trunc('month', now()) + interval '1 month',
  updated_at timestamptz DEFAULT now()
);;
