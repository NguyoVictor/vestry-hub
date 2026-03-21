
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'testimonies' AND policyname = 'testimonies_tenant_rls') THEN
    EXECUTE 'CREATE POLICY "testimonies_tenant_rls" ON testimonies FOR ALL USING (tenant_id::text = get_my_tenant_id()::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surveys' AND policyname = 'surveys_tenant_rls') THEN
    EXECUTE 'CREATE POLICY "surveys_tenant_rls" ON surveys FOR ALL USING (tenant_id::text = get_my_tenant_id()::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_tenant_rls') THEN
    EXECUTE 'CREATE POLICY "notifications_tenant_rls" ON notifications FOR ALL USING (tenant_id::text = get_my_tenant_id()::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_tenant_rls') THEN
    EXECUTE 'CREATE POLICY "messages_tenant_rls" ON messages FOR ALL USING (tenant_id::text = get_my_tenant_id()::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_responses' AND policyname = 'survey_responses_tenant_rls') THEN
    EXECUTE 'CREATE POLICY "survey_responses_tenant_rls" ON survey_responses FOR ALL USING (
      survey_id::text IN (SELECT surveys.id FROM surveys WHERE surveys.tenant_id::text = get_my_tenant_id()::text)
    )';
  END IF;
END $$
