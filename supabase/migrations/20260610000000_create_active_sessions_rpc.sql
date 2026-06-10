CREATE OR REPLACE FUNCTION public.get_active_sessions_for_tenant(p_tenant_id text)
RETURNS TABLE (
  user_id text,
  session_created_at timestamptz,
  last_active timestamptz,
  ip_address text,
  user_agent text,
  first_name text,
  last_name text,
  role text,
  email text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE sql
AS $$
  SELECT DISTINCT ON (s.user_id::text)
    s.user_id::text,
    s.created_at as session_created_at,
    s.updated_at as last_active,
    s.ip::text as ip_address,
    s.user_agent,
    u.first_name,
    u.last_name,
    u.role,
    u.email
  FROM auth.sessions s
  JOIN public.users u ON s.user_id::text = u.id
  WHERE u.tenant_id = p_tenant_id
  AND u.status = 'active'
  ORDER BY s.user_id::text, s.updated_at DESC NULLS LAST;
$$;