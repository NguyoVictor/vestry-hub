-- Create device_tokens table for Firebase Cloud Messaging (FCM) push notifications

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (handle potential type mismatches)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "device_tokens_insert" ON public.device_tokens;
  DROP POLICY IF EXISTS "device_tokens_select" ON public.device_tokens;
  DROP POLICY IF EXISTS "device_tokens_delete" ON public.device_tokens;
  
  -- Create new policies with proper type casting
  CREATE POLICY "device_tokens_insert" ON public.device_tokens 
    FOR INSERT WITH CHECK (true);

  CREATE POLICY "device_tokens_select" ON public.device_tokens 
    FOR SELECT USING (user_id::text = auth.uid()::text);

  CREATE POLICY "device_tokens_delete" ON public.device_tokens 
    FOR DELETE USING (user_id::text = auth.uid()::text);
END $$;

-- Create indexes for performance
CREATE INDEX idx_device_tokens_tenant ON public.device_tokens(tenant_id);
CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);