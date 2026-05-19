-- Create outreach-photos storage bucket for outreach activity photos
-- Max 5MB per file, JPEG/PNG/WebP only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'outreach-photos',
  'outreach-photos',
  false,
  5242880,  -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
-- RLS Policies for outreach-photos bucket

CREATE POLICY "Authenticated users can upload outreach photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'outreach-photos');
CREATE POLICY "Authenticated users can view outreach photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'outreach-photos');
CREATE POLICY "Authenticated users can delete outreach photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'outreach-photos');
CREATE POLICY "Authenticated users can update outreach photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'outreach-photos');
