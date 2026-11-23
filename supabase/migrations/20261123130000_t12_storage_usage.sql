-- T12 — storage usage computed on the server (pre-production scope, user
-- decision 2026-11-23). Before: tenant_subscriptions.storage_used_gb — what
-- plan limits, the upload checks and the platform dashboard read — was never
-- updated: 13 upload screens tried to add the file size from the browser and
-- the database (correctly) refused, so every church showed 0 GB forever.
-- Now usage = the size of the church's files in Storage. Every church file
-- lives under "<tenant_id>/…" (Phase 5 storage policies; staging: 20/20).
--  * refresh_storage_usage(church): church staff (NULL-safe check) or the
--    platform super admin; recomputes, stores storage_used_gb, returns usage.
--  * refresh_all_storage_usage(): platform super admin only; returns
--    {tenant_id: used_gb} for every church (Churches list).
-- (tenant_subscriptions.tenant_id is uuid, unlike the varchar elsewhere: compared as text.)
-- No trigger on storage.objects (a failing trigger there would break every
-- upload). Server-side upload blocking stays a follow-up (client checks now
-- use accurate numbers). Rollback: drop the three functions.

CREATE OR REPLACE FUNCTION private.tenant_storage_bytes(p_tenant_id text)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT coalesce(sum(coalesce((o.metadata->>'size')::bigint, 0)), 0)::bigint
    FROM storage.objects o
   WHERE split_part(o.name, '/', 1) = p_tenant_id;
$fn$;

CREATE OR REPLACE FUNCTION public.refresh_storage_usage(p_tenant_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_bytes bigint; v_gb numeric; v_limit numeric;
BEGIN
  IF (p_tenant_id IS NOT NULL
      AND (private.is_platform_super_admin()
           OR p_tenant_id = (private.get_staff_tenant_id())::text)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Only staff of this church can view its storage usage.' USING ERRCODE = '42501';
  END IF;
  v_bytes := private.tenant_storage_bytes(p_tenant_id);
  v_gb := round(v_bytes::numeric / 1073741824, 6);
  UPDATE public.tenant_subscriptions SET storage_used_gb = v_gb
   WHERE tenant_id::text = p_tenant_id AND storage_used_gb IS DISTINCT FROM v_gb;
  SELECT coalesce(storage_limit_gb, 2) + coalesce(storage_addons_gb, 0) INTO v_limit
    FROM public.tenant_subscriptions WHERE tenant_id::text = p_tenant_id;
  RETURN jsonb_build_object('used_bytes', v_bytes, 'used_gb', v_gb, 'limit_gb', coalesce(v_limit, 2));
END $fn$;

CREATE OR REPLACE FUNCTION public.refresh_all_storage_usage()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_usage jsonb;
BEGIN
  IF private.is_platform_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the platform administrator can refresh all churches.' USING ERRCODE = '42501';
  END IF;
  -- {tenant_id: used_gb} for every church (also those without a subscription row).
  SELECT coalesce(jsonb_object_agg(t.id, round(coalesce(u.bytes, 0)::numeric / 1073741824, 6)), '{}'::jsonb)
    INTO v_usage
    FROM public.tenants t
    LEFT JOIN (SELECT split_part(o.name, '/', 1) AS tenant_id, sum(coalesce((o.metadata->>'size')::bigint, 0)) AS bytes
                 FROM storage.objects o GROUP BY 1) u ON u.tenant_id = t.id;
  UPDATE public.tenant_subscriptions s
     SET storage_used_gb = (v_usage ->> s.tenant_id::text)::numeric
   WHERE v_usage ? s.tenant_id::text AND s.storage_used_gb IS DISTINCT FROM (v_usage ->> s.tenant_id::text)::numeric;
  RETURN v_usage;
END $fn$;

REVOKE ALL ON FUNCTION private.tenant_storage_bytes(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_storage_usage(text), public.refresh_all_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_storage_usage(text), public.refresh_all_storage_usage() TO authenticated;
