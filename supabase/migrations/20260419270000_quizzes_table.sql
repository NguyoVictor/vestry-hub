CREATE TABLE IF NOT EXISTS quizzes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  title varchar NOT NULL DEFAULT 'Untitled Quiz',
  questions jsonb DEFAULT '[]'::jsonb,
  status varchar DEFAULT 'draft',
  grade_level varchar,
  dok_levels text[],
  question_types text[],
  num_questions int,
  language varchar DEFAULT 'English',
  allow_doc_reading boolean DEFAULT false,
  source_file_name varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_tenant ON quizzes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(tenant_id, status);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_tenant_rls" ON quizzes FOR ALL USING (tenant_id = get_my_tenant_id());
