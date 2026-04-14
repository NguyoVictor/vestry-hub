-- Create sermon-thumbnails (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sermon-thumbnails',
  'sermon-thumbnails',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create sermon-audio (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sermon-audio',
  'sermon-audio',
  false,
  104857600,
  ARRAY['audio/mpeg','audio/wav','audio/x-m4a','audio/mp4','audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Create sermon-documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sermon-documents',
  'sermon-documents',
  false,
  20971520,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- RLS: sermon-thumbnails — authenticated upload
CREATE POLICY "Authenticated users can upload sermon thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sermon-thumbnails');

-- RLS: sermon-thumbnails — public read
CREATE POLICY "Public can read sermon thumbnails"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sermon-thumbnails');

-- RLS: sermon-thumbnails — authenticated delete own
CREATE POLICY "Authenticated users can delete sermon thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sermon-thumbnails');

-- RLS: sermon-audio — authenticated upload
CREATE POLICY "Authenticated users can upload sermon audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sermon-audio');

-- RLS: sermon-audio — authenticated read
CREATE POLICY "Authenticated users can read sermon audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'sermon-audio');

-- RLS: sermon-audio — authenticated delete
CREATE POLICY "Authenticated users can delete sermon audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sermon-audio');

-- RLS: sermon-documents — authenticated upload
CREATE POLICY "Authenticated users can upload sermon documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sermon-documents');

-- RLS: sermon-documents — authenticated read
CREATE POLICY "Authenticated users can read sermon documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'sermon-documents');

-- RLS: sermon-documents — authenticated delete
CREATE POLICY "Authenticated users can delete sermon documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sermon-documents');;
