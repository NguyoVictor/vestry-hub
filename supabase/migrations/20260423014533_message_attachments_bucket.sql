-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "msg_attachments_insert" ON storage.objects;
CREATE POLICY "msg_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');

-- Allow anon to upload (member portal)
DROP POLICY IF EXISTS "msg_attachments_insert_anon" ON storage.objects;
CREATE POLICY "msg_attachments_insert_anon" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'message-attachments');

-- Allow authenticated to read
DROP POLICY IF EXISTS "msg_attachments_read" ON storage.objects;
CREATE POLICY "msg_attachments_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'message-attachments');

-- Allow anon to read (member portal)
DROP POLICY IF EXISTS "msg_attachments_read_anon" ON storage.objects;
CREATE POLICY "msg_attachments_read_anon" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'message-attachments');

-- Add attachment_url column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type text;;
