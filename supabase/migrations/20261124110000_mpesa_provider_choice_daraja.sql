-- M-Pesa provider choice per church (user decision 2026-11-24): each church
-- chooses IntaSend (its own IntaSend account) or Safaricom Daraja (direct to
-- its own paybill / till). One active provider per church.
--  * tenants.mpesa_enabled / tenants.mpesa_provider: what the giving pages
--    and process-stk-push use. Backfilled from intasend_enabled. Only the
--    server (service role) or the platform admin may change them (existing
--    guard extended). Browsers can read them (non-secret).
--  * Daraja credentials (consumer key, consumer secret, passkey) are stored as
--    ONE Vault secret (JSON); tenant_payment_credentials keeps only the Vault
--    id, shortcode, till number, transaction type, environment and the SHA-256
--    of the church's callback token. The old plaintext daraja_* columns stay
--    unused (all empty).
--  * Connecting a provider makes it the church's active provider; clearing the
--    active one switches M-Pesa giving off.
-- Rollback: drop the functions/columns below; restore intasend_* functions and
-- intasend_connection_status from 20261123160000.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS mpesa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mpesa_provider text CHECK (mpesa_provider IS NULL OR mpesa_provider IN ('intasend', 'daraja'));
UPDATE public.tenants SET mpesa_enabled = true, mpesa_provider = 'intasend'
 WHERE intasend_enabled AND mpesa_provider IS NULL;
GRANT SELECT (mpesa_enabled, mpesa_provider) ON public.tenants TO authenticated;

CREATE OR REPLACE FUNCTION private.guard_tenant_payment_routing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF (NEW.intasend_enabled IS DISTINCT FROM OLD.intasend_enabled OR NEW.intasend_wallet_id IS DISTINCT FROM OLD.intasend_wallet_id
      OR NEW.mpesa_enabled IS DISTINCT FROM OLD.mpesa_enabled OR NEW.mpesa_provider IS DISTINCT FROM OLD.mpesa_provider)
     AND (SELECT auth.uid()) IS NOT NULL AND NOT private.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Only Vestry can change M-Pesa payment routing for a church' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS guard_tenant_payment_routing ON public.tenants;
CREATE TRIGGER guard_tenant_payment_routing
  BEFORE UPDATE OF intasend_enabled, intasend_wallet_id, mpesa_enabled, mpesa_provider ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION private.guard_tenant_payment_routing();

ALTER TABLE public.tenant_payment_credentials
  ADD COLUMN IF NOT EXISTS daraja_secret_id uuid,
  ADD COLUMN IF NOT EXISTS daraja_env text CHECK (daraja_env IS NULL OR daraja_env IN ('sandbox', 'production')),
  ADD COLUMN IF NOT EXISTS daraja_till_number varchar,
  ADD COLUMN IF NOT EXISTS daraja_callback_hash text,
  ADD COLUMN IF NOT EXISTS daraja_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS daraja_connected_by varchar;

-- ── IntaSend store / clear now also set the active provider ───────────────
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
  UPDATE public.tenants SET intasend_enabled = true, mpesa_enabled = true, mpesa_provider = 'intasend' WHERE id = p_tenant_id;
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
  UPDATE public.tenants SET intasend_enabled = false,
         mpesa_enabled = CASE WHEN mpesa_provider = 'intasend' THEN false ELSE mpesa_enabled END,
         mpesa_provider = CASE WHEN mpesa_provider = 'intasend' THEN NULL ELSE mpesa_provider END
   WHERE id = p_tenant_id;
END $fn$;

-- ── Daraja (service role only) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.daraja_store_credentials(
  p_tenant_id text, p_consumer_key text, p_consumer_secret text, p_passkey text,
  p_shortcode text, p_till_number text, p_transaction_type text, p_env text, p_callback_token text, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_id uuid; v_secret text;
BEGIN
  IF p_env NOT IN ('sandbox', 'production') OR p_transaction_type NOT IN ('CustomerPayBillOnline', 'CustomerBuyGoodsOnline')
     OR coalesce(p_consumer_key, '') = '' OR coalesce(p_consumer_secret, '') = '' OR coalesce(p_passkey, '') = ''
     OR coalesce(p_shortcode, '') !~ '^[0-9]{5,8}$' OR coalesce(p_callback_token, '') = ''
     OR (p_transaction_type = 'CustomerBuyGoodsOnline' AND coalesce(p_till_number, '') !~ '^[0-9]{5,8}$') THEN
    RAISE EXCEPTION 'Invalid Daraja credentials.' USING ERRCODE = '22023';
  END IF;
  v_secret := jsonb_build_object('consumer_key', p_consumer_key, 'consumer_secret', p_consumer_secret, 'passkey', p_passkey)::text;
  INSERT INTO public.tenant_payment_credentials(tenant_id) VALUES (p_tenant_id) ON CONFLICT (tenant_id) DO NOTHING;
  SELECT daraja_secret_id INTO v_id FROM public.tenant_payment_credentials WHERE tenant_id = p_tenant_id FOR UPDATE;
  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_id) THEN
    PERFORM vault.update_secret(v_id, v_secret);
  ELSE
    v_id := vault.create_secret(v_secret, 'daraja_secret_' || p_tenant_id || '_' || replace(gen_random_uuid()::text, '-', ''),
                                'Daraja credentials for church ' || p_tenant_id);
  END IF;
  UPDATE public.tenant_payment_credentials
     SET daraja_secret_id = v_id, daraja_shortcode = p_shortcode,
         daraja_till_number = CASE WHEN p_transaction_type = 'CustomerBuyGoodsOnline' THEN p_till_number END,
         daraja_transaction_type = p_transaction_type, daraja_env = p_env,
         daraja_callback_hash = encode(sha256(convert_to(p_callback_token, 'UTF8')), 'hex'),
         daraja_consumer_key = NULL, daraja_consumer_secret = NULL, daraja_passkey = NULL,
         daraja_connected_at = now(), daraja_connected_by = p_actor, updated_at = now()
   WHERE tenant_id = p_tenant_id;
  UPDATE public.tenants SET mpesa_enabled = true, mpesa_provider = 'daraja' WHERE id = p_tenant_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.daraja_clear_credentials(p_tenant_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_id uuid;
BEGIN
  SELECT daraja_secret_id INTO v_id FROM public.tenant_payment_credentials WHERE tenant_id = p_tenant_id;
  IF v_id IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = v_id; END IF;
  UPDATE public.tenant_payment_credentials
     SET daraja_secret_id = NULL, daraja_shortcode = NULL, daraja_till_number = NULL, daraja_transaction_type = DEFAULT,
         daraja_env = NULL, daraja_callback_hash = NULL, daraja_connected_at = NULL, daraja_connected_by = NULL, updated_at = now()
   WHERE tenant_id = p_tenant_id;
  UPDATE public.tenants SET
         mpesa_enabled = CASE WHEN mpesa_provider = 'daraja' THEN false ELSE mpesa_enabled END,
         mpesa_provider = CASE WHEN mpesa_provider = 'daraja' THEN NULL ELSE mpesa_provider END
   WHERE id = p_tenant_id;
END $fn$;

-- Credentials + settings for server functions.
CREATE OR REPLACE FUNCTION public.daraja_config_for_tenant(p_tenant_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT ds.decrypted_secret::jsonb || jsonb_build_object(
           'shortcode', c.daraja_shortcode, 'till_number', c.daraja_till_number,
           'transaction_type', c.daraja_transaction_type, 'env', c.daraja_env)
    FROM public.tenant_payment_credentials c
    JOIN vault.decrypted_secrets ds ON ds.id = c.daraja_secret_id
   WHERE c.tenant_id = p_tenant_id;
$fn$;

CREATE OR REPLACE FUNCTION public.daraja_callback_ok(p_tenant_id text, p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT coalesce((SELECT c.daraja_callback_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
                     FROM public.tenant_payment_credentials c
                    WHERE c.tenant_id = p_tenant_id AND c.daraja_callback_hash IS NOT NULL), false);
$fn$;

REVOKE ALL ON FUNCTION public.daraja_store_credentials(text, text, text, text, text, text, text, text, text, text),
  public.daraja_clear_credentials(text), public.daraja_config_for_tenant(text), public.daraja_callback_ok(text, text),
  public.intasend_store_credentials(text, text, text, text, text, text), public.intasend_clear_credentials(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.daraja_store_credentials(text, text, text, text, text, text, text, text, text, text),
  public.daraja_clear_credentials(text), public.daraja_config_for_tenant(text), public.daraja_callback_ok(text, text),
  public.intasend_store_credentials(text, text, text, text, text, text), public.intasend_clear_credentials(text)
  TO service_role;

-- ── Status for the app (no secrets), both providers ───────────────────────
CREATE OR REPLACE FUNCTION public.payment_connection_status(p_tenant_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE c public.tenant_payment_credentials; t public.tenants;
BEGIN
  IF (p_tenant_id IS NOT NULL
      AND (private.is_platform_super_admin() OR p_tenant_id = (private.get_staff_tenant_id())::text)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Only staff of this church can view its payment settings.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.tenant_payment_credentials WHERE tenant_id = p_tenant_id;
  SELECT * INTO t FROM public.tenants WHERE id = p_tenant_id;
  RETURN jsonb_build_object(
    'enabled', coalesce(t.mpesa_enabled, false), 'provider', t.mpesa_provider,
    'intasend', jsonb_build_object('connected', c.intasend_secret_id IS NOT NULL, 'env', c.intasend_env,
        'publishable_key_hint', CASE WHEN c.intasend_publishable_key IS NULL THEN NULL
                                     ELSE left(c.intasend_publishable_key, 15) || '…' || right(c.intasend_publishable_key, 4) END,
        'challenge_set', c.intasend_challenge_hash IS NOT NULL, 'connected_at', c.intasend_connected_at),
    'daraja', jsonb_build_object('connected', c.daraja_secret_id IS NOT NULL, 'env', c.daraja_env,
        'shortcode', c.daraja_shortcode, 'till_number', c.daraja_till_number,
        'transaction_type', c.daraja_transaction_type, 'connected_at', c.daraja_connected_at));
END $fn$;
REVOKE ALL ON FUNCTION public.payment_connection_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_connection_status(text) TO authenticated;
