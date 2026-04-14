CREATE TABLE IF NOT EXISTS public.sermon_archives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  preacher TEXT,
  sermon_date DATE,
  scripture_references TEXT,
  description TEXT,
  tags TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  storage_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  uploaded_by TEXT REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sermon_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_access_sermon_archives" ON public.sermon_archives
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sermon_archives_tenant_id ON public.sermon_archives(tenant_id);;
