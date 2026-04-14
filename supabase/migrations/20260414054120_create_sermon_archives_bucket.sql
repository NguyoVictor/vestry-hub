INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sermon-archives', 'sermon-archives', false, 52428800,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','application/rtf','text/rtf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_sermon_archives" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sermon-archives');
CREATE POLICY "auth_read_sermon_archives" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sermon-archives');
CREATE POLICY "auth_delete_sermon_archives" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sermon-archives');;
