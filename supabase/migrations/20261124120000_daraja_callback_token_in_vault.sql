-- Daraja: the payment-prompt function must BUILD the church's callback URL on
-- every STK push, so the callback token is also kept inside the church's
-- encrypted Vault secret (the table keeps only its SHA-256 for verification).
-- Replaces daraja_store_credentials from 20261124110000 (no other change).

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
  v_secret := jsonb_build_object('consumer_key', p_consumer_key, 'consumer_secret', p_consumer_secret, 'passkey', p_passkey,
                                'callback_token', p_callback_token)::text;
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

REVOKE ALL ON FUNCTION public.daraja_store_credentials(text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.daraja_store_credentials(text, text, text, text, text, text, text, text, text, text) TO service_role;
