-- Fix 1: Prevent privilege escalation via UPDATE on sensitive columns
REVOKE UPDATE (role, status, tenant_id) ON public.users FROM authenticated;
-- Fix 2: Prevent exposure of password_hash and mfa_secret via SELECT
REVOKE SELECT (password_hash, mfa_secret) ON public.users FROM authenticated;
-- Fix 3: Prevent exposure of stream_key via SELECT on livestreams
REVOKE SELECT (stream_key) ON public.livestreams FROM authenticated;
