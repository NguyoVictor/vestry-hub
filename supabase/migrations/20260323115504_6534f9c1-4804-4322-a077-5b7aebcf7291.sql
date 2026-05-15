-- Fix 1: Prevent privilege escalation via UPDATE on sensitive columns
DO $$
BEGIN
  -- Only revoke if the columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    EXECUTE 'REVOKE UPDATE (role) ON public.users FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
    EXECUTE 'REVOKE UPDATE (status) ON public.users FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
    EXECUTE 'REVOKE UPDATE (tenant_id) ON public.users FROM authenticated';
  END IF;
END $$;
-- Fix 2: Prevent exposure of password_hash and mfa_secret via SELECT (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    EXECUTE 'REVOKE SELECT (password_hash) ON public.users FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_secret') THEN
    EXECUTE 'REVOKE SELECT (mfa_secret) ON public.users FROM authenticated';
  END IF;
END $$;
-- Fix 3: Prevent exposure of stream_key via SELECT on livestreams (only if table and column exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'livestreams') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'livestreams' AND column_name = 'stream_key') THEN
    EXECUTE 'REVOKE SELECT (stream_key) ON public.livestreams FROM authenticated';
  END IF;
END $$;
