-- Visitors
CREATE TABLE IF NOT EXISTS visitors (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name varchar NOT NULL,
  last_name varchar NOT NULL,
  phone varchar,
  email varchar,
  visit_date date NOT NULL,
  how_heard varchar,
  notes text,
  converted_to_member_id varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- New Converts
CREATE TABLE IF NOT EXISTS new_converts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id varchar REFERENCES users(id),
  visitor_id varchar REFERENCES visitors(id),
  salvation_date date,
  counsellor_id varchar REFERENCES users(id),
  discipleship_stage varchar,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Follow-Up Tasks
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  description text,
  assigned_to varchar REFERENCES users(id),
  related_member_id varchar REFERENCES users(id),
  related_visitor_id varchar REFERENCES visitors(id),
  due_date date,
  priority task_priority_enum DEFAULT 'medium',
  status task_status_enum DEFAULT 'open',
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);;
