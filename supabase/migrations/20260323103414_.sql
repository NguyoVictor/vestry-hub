CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
 RETURNS character varying
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT tenant_id FROM users WHERE id = auth.uid()::text
$function$;;
