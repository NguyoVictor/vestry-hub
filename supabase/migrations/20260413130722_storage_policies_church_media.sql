-- Storage policies for church-media (images)
CREATE POLICY "public_read_church_media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'church-media');
CREATE POLICY "auth_upload_church_media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'church-media');
CREATE POLICY "auth_delete_church_media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'church-media');

-- Storage policies for church-audio
CREATE POLICY "public_read_church_audio" ON storage.objects FOR SELECT TO public USING (bucket_id = 'church-audio');
CREATE POLICY "auth_upload_church_audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'church-audio');
CREATE POLICY "auth_delete_church_audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'church-audio');

-- Storage policies for church-video
CREATE POLICY "public_read_church_video" ON storage.objects FOR SELECT TO public USING (bucket_id = 'church-video');
CREATE POLICY "auth_upload_church_video" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'church-video');
CREATE POLICY "auth_delete_church_video" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'church-video');;
