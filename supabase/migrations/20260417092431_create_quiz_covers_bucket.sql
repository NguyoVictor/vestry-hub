INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quiz-covers', 'quiz-covers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_quiz_covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quiz-covers');

CREATE POLICY "public_read_quiz_covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'quiz-covers');

CREATE POLICY "auth_delete_quiz_covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quiz-covers');;
