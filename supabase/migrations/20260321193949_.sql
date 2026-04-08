
CREATE TABLE security_alerts (
  id varchar DEFAULT gen_random_uuid()::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  severity varchar NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  alert_type varchar NOT NULL,
  description text NOT NULL,
  affected_user_id varchar,
  affected_user_name text,
  ip_address text,
  location text,
  raw_data jsonb,
  status varchar DEFAULT 'open' CHECK (status IN ('open','investigating','resolved')),
  resolution_notes text,
  resolved_by varchar,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE POLICY "security_alerts_tenant_rls" ON security_alerts FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);

CREATE TABLE incident_updates (
  id varchar DEFAULT gen_random_uuid()::text PRIMARY KEY,
  incident_id varchar NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  update_text text NOT NULL,
  status_at_time varchar,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
CREATE POLICY "incident_updates_tenant_rls" ON incident_updates FOR ALL USING (
  incident_id::text IN (SELECT incidents.id FROM incidents WHERE incidents.tenant_id::text = get_my_tenant_id()::text)
);

CREATE TABLE conversations (
  id varchar DEFAULT gen_random_uuid()::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type varchar DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name text,
  last_message_preview text,
  last_message_at timestamptz,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE POLICY "conversations_tenant_rls" ON conversations FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);

CREATE TABLE conversation_participants (
  id varchar DEFAULT gen_random_uuid()::text PRIMARY KEY,
  conversation_id varchar NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id varchar NOT NULL,
  unread_count int DEFAULT 0,
  last_read_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
CREATE POLICY "conv_participants_rls" ON conversation_participants FOR ALL USING (
  conversation_id::text IN (SELECT conversations.id FROM conversations WHERE conversations.tenant_id::text = get_my_tenant_id()::text)
);

CREATE TABLE survey_answers (
  id varchar DEFAULT gen_random_uuid()::text PRIMARY KEY,
  response_id varchar NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_index int NOT NULL,
  question_type varchar NOT NULL,
  question_text text NOT NULL,
  answer_value jsonb,
  file_url text,
  created_at timestamptz DEFAULT now()
);
CREATE POLICY "survey_answers_rls" ON survey_answers FOR ALL USING (
  response_id::text IN (
    SELECT survey_responses.id FROM survey_responses
    JOIN surveys ON survey_responses.survey_id = surveys.id
    WHERE surveys.tenant_id::text = get_my_tenant_id()::text
  )
);

CREATE TABLE broadcasts (
  id varchar DEFAULT gen_random_uuid()::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  channels text[] NOT NULL DEFAULT '{in_app}',
  recipient_type varchar NOT NULL DEFAULT 'all_members',
  recipient_config jsonb DEFAULT '{}',
  recipient_count int DEFAULT 0,
  delivered_count int DEFAULT 0,
  read_count int DEFAULT 0,
  status varchar DEFAULT 'sent' CHECK (status IN ('draft','scheduled','sent','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  sent_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE POLICY "broadcasts_tenant_rls" ON broadcasts FOR ALL USING (tenant_id::text = get_my_tenant_id()::text)
;
