CREATE POLICY "auth_upload_resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources');
CREATE POLICY "auth_read_resources" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resources');
CREATE POLICY "auth_delete_resources" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources');;
