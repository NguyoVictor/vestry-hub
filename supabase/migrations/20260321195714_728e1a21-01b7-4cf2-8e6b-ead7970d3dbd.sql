-- Tables that might already exist from prior phases - skip if exists
CREATE TABLE IF NOT EXISTS media_folders (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id varchar REFERENCES media_folders(id) ON DELETE CASCADE,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_folders' AND policyname = 'media_folders_tenant_rls') THEN
    CREATE POLICY "media_folders_tenant_rls" ON media_folders FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS media_assets (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  folder_id varchar REFERENCES media_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  width int,
  height int,
  tags text[],
  uploaded_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'media_assets_tenant_rls') THEN
    CREATE POLICY "media_assets_tenant_rls" ON media_assets FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS ai_tool_usage (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  input_summary text,
  output_length int,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_tool_usage' AND policyname = 'ai_tool_usage_tenant_rls') THEN
    CREATE POLICY "ai_tool_usage_tenant_rls" ON ai_tool_usage FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS sermon_series (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  start_date date,
  end_date date,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sermon_series' AND policyname = 'sermon_series_tenant_rls') THEN
    CREATE POLICY "sermon_series_tenant_rls" ON sermon_series FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS studio_media (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('audio','video')),
  file_url text NOT NULL,
  thumbnail_url text,
  speaker text,
  speaker_member_id varchar,
  series_id varchar REFERENCES sermon_series(id) ON DELETE SET NULL,
  scripture_reference text,
  description text,
  duration_seconds int,
  file_size bigint,
  recording_date date,
  tags text[],
  status text DEFAULT 'published' CHECK (status IN ('published','draft','processing')),
  linked_sermon_id varchar,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_media' AND policyname = 'studio_media_tenant_rls') THEN
    CREATE POLICY "studio_media_tenant_rls" ON studio_media FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS bible_notes (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id varchar NOT NULL,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  book text NOT NULL,
  chapter int NOT NULL,
  verse int NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bible_notes' AND policyname = 'bible_notes_user_rls') THEN
    CREATE POLICY "bible_notes_user_rls" ON bible_notes FOR ALL USING (user_id = auth.uid()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS bible_highlights (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id varchar NOT NULL,
  book text NOT NULL,
  chapter int NOT NULL,
  verse int NOT NULL,
  color text DEFAULT 'yellow' CHECK (color IN ('yellow','green','blue','pink')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book, chapter, verse)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bible_highlights' AND policyname = 'bible_highlights_user_rls') THEN
    CREATE POLICY "bible_highlights_user_rls" ON bible_highlights FOR ALL USING (user_id = auth.uid()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS bible_favorites (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id varchar NOT NULL,
  book text NOT NULL,
  chapter int NOT NULL,
  verse int NOT NULL,
  verse_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book, chapter, verse)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bible_favorites' AND policyname = 'bible_favorites_user_rls') THEN
    CREATE POLICY "bible_favorites_user_rls" ON bible_favorites FOR ALL USING (user_id = auth.uid()::text);
  END IF;
END $$;
-- Songs already exists, add RLS if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'songs' AND policyname = 'songs_tenant_rls') THEN
    CREATE POLICY "songs_tenant_rls" ON songs FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS set_lists (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  service_date date,
  service_id varchar,
  notes text,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'set_lists' AND policyname = 'set_lists_tenant_rls') THEN
    CREATE POLICY "set_lists_tenant_rls" ON set_lists FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS set_list_songs (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  set_list_id varchar NOT NULL REFERENCES set_lists(id) ON DELETE CASCADE,
  song_id varchar NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position int NOT NULL,
  key_override text,
  notes text,
  UNIQUE(set_list_id, song_id)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'set_list_songs' AND policyname = 'set_list_songs_rls') THEN
    CREATE POLICY "set_list_songs_rls" ON set_list_songs FOR ALL USING (
      set_list_id::text IN (SELECT set_lists.id FROM set_lists WHERE set_lists.tenant_id::text = get_my_tenant_id()::text)
    );
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS media_albums (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  cover_photo_url text,
  linked_event_id varchar,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_albums' AND policyname = 'media_albums_tenant_rls') THEN
    CREATE POLICY "media_albums_tenant_rls" ON media_albums FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS media_photos (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  album_id varchar REFERENCES media_albums(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'image' CHECK (file_type IN ('image','video')),
  caption text,
  file_size bigint,
  width int,
  height int,
  uploaded_by varchar,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_photos' AND policyname = 'media_photos_tenant_rls') THEN
    CREATE POLICY "media_photos_tenant_rls" ON media_photos FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  asset_id varchar NOT NULL REFERENCES church_assets(id) ON DELETE CASCADE,
  maintenance_date date DEFAULT CURRENT_DATE,
  description text NOT NULL,
  cost numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'KES',
  performed_by text,
  created_by varchar,
  created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_maintenance' AND policyname = 'asset_maintenance_rls') THEN
    CREATE POLICY "asset_maintenance_rls" ON asset_maintenance FOR ALL USING (
      asset_id::text IN (SELECT church_assets.id FROM church_assets WHERE church_assets.tenant_id::text = get_my_tenant_id()::text)
    );
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS sermons (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  scripture_reference text,
  speaker text,
  speaker_member_id varchar,
  series_id varchar REFERENCES sermon_series(id) ON DELETE SET NULL,
  occasion text DEFAULT 'regular_service',
  target_audience text,
  estimated_duration int,
  date_to_preach date,
  introduction text,
  main_points jsonb DEFAULT '[]',
  conclusion text,
  altar_call text,
  manuscript text,
  notes text,
  tags text[],
  status text DEFAULT 'draft',
  linked_studio_media_id varchar,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sermons' AND policyname = 'sermons_tenant_rls') THEN
    CREATE POLICY "sermons_tenant_rls" ON sermons FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS livestreams (
  id varchar NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text NOT NULL,
  stream_url text NOT NULL,
  stream_key text,
  embed_url text,
  chat_embed_url text,
  linked_service_id varchar,
  linked_event_id varchar,
  scheduled_start timestamptz,
  estimated_duration int,
  description text,
  show_on_public_page boolean DEFAULT true,
  notify_members boolean DEFAULT true,
  status text DEFAULT 'scheduled',
  actual_start timestamptz,
  actual_end timestamptz,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'livestreams' AND policyname = 'livestreams_tenant_rls') THEN
    CREATE POLICY "livestreams_tenant_rls" ON livestreams FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
  END IF;
END $$;
