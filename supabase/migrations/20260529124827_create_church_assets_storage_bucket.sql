-- Create church-assets storage bucket for email attachments and other assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'church-assets',
  'church-assets',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for church-assets
CREATE POLICY "public_read_church_assets" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'church-assets');

CREATE POLICY "auth_upload_church_assets" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'church-assets');

CREATE POLICY "auth_delete_church_assets" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'church-assets');

CREATE POLICY "auth_update_church_assets" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'church-assets');