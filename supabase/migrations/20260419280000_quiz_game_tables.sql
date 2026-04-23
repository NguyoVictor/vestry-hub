CREATE TABLE IF NOT EXISTS quiz_sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  quiz_id varchar NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  join_code varchar(6) NOT NULL UNIQUE,
  join_url text,
  status varchar DEFAULT 'waiting',
  host_user_id varchar REFERENCES users(id),
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{}'::jsonb,
  theme varchar DEFAULT 'classic',
  confetti_enabled boolean DEFAULT true,
  music_enabled boolean DEFAULT true,
  current_question_index int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_code ON quiz_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_tenant ON quiz_sessions(tenant_id);
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_sessions_tenant" ON quiz_sessions FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE TABLE IF NOT EXISTS quiz_participants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id varchar NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id),
  display_name varchar NOT NULL,
  avatar_emoji varchar DEFAULT '🦊',
  score int DEFAULT 0,
  rank int DEFAULT 0,
  coins int DEFAULT 0,
  streak int DEFAULT 0,
  is_host boolean DEFAULT false,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session ON quiz_participants(session_id);
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_participants_all" ON quiz_participants FOR ALL USING (true);
CREATE TABLE IF NOT EXISTS quiz_answers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id varchar NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  participant_id varchar NOT NULL REFERENCES quiz_participants(id) ON DELETE CASCADE,
  question_index int NOT NULL,
  answer_given text,
  is_correct boolean DEFAULT false,
  time_taken_ms int DEFAULT 0,
  points_earned int DEFAULT 0,
  answered_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON quiz_answers(session_id);
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_answers_all" ON quiz_answers FOR ALL USING (true);
CREATE TABLE IF NOT EXISTS quiz_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id varchar NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  event_type varchar NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_events_session ON quiz_events(session_id);
ALTER TABLE quiz_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_events_all" ON quiz_events FOR ALL USING (true);
