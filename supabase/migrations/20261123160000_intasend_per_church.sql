-- IntaSend: ONE ACCOUNT PER CHURCH (user decision 2026-11-23; church accounts
-- are KYC-verified with IntaSend). Replaces the single platform key model of
-- 20261121090000 — money goes straight to each church's own IntaSend account.
--  * Each church's SECRET key is stored in Supabase Vault (encrypted at rest);
--    tenant_payment_credentials (no browser access: no policies, no grants)
--    keeps only the Vault id, the publishable key, the environment (live /
--    test) and the SHA-256 of the church's webhook challenge.
--  * Only server functions (service_role) can store or read credentials.
--  * Browsers can only read a church's connection STATUS (no secrets), and only
--    staff of that church.
-- Rollback: drop the functions + columns below (Vault secrets: delete by id).

ALTER TABLE public.tenant_payment_credentials
  ADD COLUMN IF NOT EXISTS intasend_secret_id uuid,
  ADD COLUMN IF NOT EXISTS intasend_publishable_key text,
  ADD COLUMN IF NOT EXISTS intasend_env text CHECK (intasend_env IS NULL OR intasend_env IN ('live', 'test')),
  ADD COLUMN IF NOT EXISTS intasend_challenge_hash text,
  ADD COLUMN IF NOT EXISTS intasend_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS intasend_connected_by varchar;

-- ── Server-only (service_role) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.intasend_store_credentials(
  p_tenant_id text, p_secret_key text, p_publishable_key text, p_env text, p_challenge text, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_id uuid;
BEGIN
  IF p_env NOT IN ('live', 'test') OR coalesce(p_secret_key, '') = '' OR coalesce(p_challenge, '') = '' THEN
    RAISE EXCEPTION 'Invalid IntaSend credentials.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.tenant_payment_credentials(tenant_id) VALUES (p_tenant_id) ON CONFLICT (tenant_id) DO NOTHING;
  SELECT intasend_secret_id INTO v_id FROM public.tenant_payment_credentials WHERE tenant_id = p_tenant_id FOR UPDATE;
  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_id) THEN
    PERFORM vault.update_secret(v_id, p_secret_key);
  ELSE
    v_id := vault.create_secret(p_secret_key, 'intasend_secret_' || p_tenant_id || '_' || replace(gen_random_uuid()::text, '-', ''),
                                'IntaSend secret key for church ' || p_tenant_id);
  END IF;
  UPDATE public.tenant_payment_credentials
     SET intasend_secret_id = v_id, intasend_publishable_key = p_publishable_key, intasend_env = p_env,
         intasend_challenge_hash = encode(sha256(convert_to(p_challenge, 'UTF8')), 'hex'),
         intasend_connected_at = now(), intasend_connected_by = p_actor, updated_at = now()
   WHERE tenant_id = p_tenant_id;
  UPDATE public.tenants SET intasend_enabled = true WHERE id = p_tenant_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.intasend_set_challenge(p_tenant_id text, p_challenge text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF coalesce(p_challenge, '') = '' THEN RAISE EXCEPTION 'Invalid challenge.' USING ERRCODE = '22023'; END IF;
  UPDATE public.tenant_payment_credentials
     SET intasend_challenge_hash = encode(sha256(convert_to(p_challenge, 'UTF8')), 'hex'), updated_at = now()
   WHERE tenant_id = p_tenant_id AND intasend_secret_id IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'IntaSend is not connected for this church.' USING ERRCODE = 'P0002'; END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public.intasend_clear_credentials(p_tenant_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_id uuid;
BEGIN
  SELECT intasend_secret_id INTO v_id FROM public.tenant_payment_credentials WHERE tenant_id = p_tenant_id;
  IF v_id IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = v_id; END IF;
  UPDATE public.tenant_payment_credentials
     SET intasend_secret_id = NULL, intasend_publishable_key = NULL, intasend_env = NULL, intasend_challenge_hash = NULL,
         intasend_connected_at = NULL, intasend_connected_by = NULL, updated_at = now()
   WHERE tenant_id = p_tenant_id;
  UPDATE public.tenants SET intasend_enabled = false WHERE id = p_tenant_id;
END $fn$;

-- Secret for server functions (payment prompt + webhook re-verification).
CREATE OR REPLACE FUNCTION public.intasend_secret_for_tenant(p_tenant_id text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT ds.decrypted_secret
    FROM public.tenant_payment_credentials c
    JOIN vault.decrypted_secrets ds ON ds.id = c.intasend_secret_id
   WHERE c.tenant_id = p_tenant_id;
$fn$;

CREATE OR REPLACE FUNCTION public.intasend_challenge_ok(p_tenant_id text, p_challenge text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT coalesce((SELECT c.intasend_challenge_hash = encode(sha256(convert_to(coalesce(p_challenge, ''), 'UTF8')), 'hex')
                     FROM public.tenant_payment_credentials c
                    WHERE c.tenant_id = p_tenant_id AND c.intasend_challenge_hash IS NOT NULL), false);
$fn$;

REVOKE ALL ON FUNCTION public.intasend_store_credentials(text, text, text, text, text, text),
  public.intasend_set_challenge(text, text), public.intasend_clear_credentials(text),
  public.intasend_secret_for_tenant(text), public.intasend_challenge_ok(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.intasend_store_credentials(text, text, text, text, text, text),
  public.intasend_set_challenge(text, text), public.intasend_clear_credentials(text),
  public.intasend_secret_for_tenant(text), public.intasend_challenge_ok(text, text) TO service_role;

-- ── Status for the app (no secrets) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.intasend_connection_status(p_tenant_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE c public.tenant_payment_credentials;
BEGIN
  IF (p_tenant_id IS NOT NULL
      AND (private.is_platform_super_admin() OR p_tenant_id = (private.get_staff_tenant_id())::text)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Only staff of this church can view its payment settings.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.tenant_payment_credentials WHERE tenant_id = p_tenant_id;
  RETURN jsonb_build_object(
    'connected', c.intasend_secret_id IS NOT NULL,
    'env', c.intasend_env,
    'publishable_key_hint', CASE WHEN c.intasend_publishable_key IS NULL THEN NULL
                                 ELSE left(c.intasend_publishable_key, 15) || '…' || right(c.intasend_publishable_key, 4) END,
    'challenge_set', c.intasend_challenge_hash IS NOT NULL,
    'connected_at', c.intasend_connected_at,
    'enabled', coalesce((SELECT t.intasend_enabled FROM public.tenants t WHERE t.id = p_tenant_id), false));
END $fn$;
REVOKE ALL ON FUNCTION public.intasend_connection_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intasend_connection_status(text) TO authenticated;
