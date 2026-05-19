-- Make church-media bucket public
UPDATE storage.buckets SET public = true WHERE id = 'church-media';
-- Create church-audio bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('church-audio', 'church-audio', true, 52428800, ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac','audio/m4a'])
ON CONFLICT (id) DO NOTHING;
-- Create church-video bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('church-video', 'church-video', true, 524288000, ARRAY['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo'])
ON CONFLICT (id) DO NOTHING;
-- Create church_media_items table
CREATE TABLE IF NOT EXISTS public.church_media_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
  title TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  uploaded_by TEXT REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS
ALTER TABLE public.church_media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.church_media_items
  FOR ALL USING (tenant_id = (SELECT id FROM public.tenants WHERE id = tenant_id));
CREATE POLICY "authenticated_access" ON public.church_media_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Index
CREATE INDEX IF NOT EXISTS idx_church_media_items_tenant_id ON public.church_media_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_church_media_items_type ON public.church_media_items(tenant_id, media_type);
