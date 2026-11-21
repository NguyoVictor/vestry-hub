-- Recovery Phase 9 — IntaSend M-Pesa giving (user decision: IntaSend replaces
-- PayHero/Daraja). Verified on staging 2026-11-21.
--  * Church-level switch + optional IntaSend wallet (non-secret). Provider
--    SECRETS live only in function secrets (INTASEND_SECRET_KEY,
--    INTASEND_WEBHOOK_CHALLENGE), never in tables or the browser.
--  * giving_records: IntaSend invoice id (unique) + provider.
--  * payment_events: idempotency / audit log of webhook deliveries
--    (one row per invoice+state), written by the webhook function only.
--  * giving_records was readable by STAFF only → a member never saw their own
--    gift (the giving page listens on the row for the STK result, and giving
--    history was empty). Members may now read THEIR OWN gifts.
-- Additive. Rollback: drop the added columns / table / policy.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS intasend_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intasend_wallet_id text;
-- tenants uses column-level SELECT grants (Phase 5, 20261120200000): grant the new non-secret columns.
GRANT SELECT (intasend_enabled, intasend_wallet_id) ON public.tenants TO authenticated;

ALTER TABLE public.giving_records
  ADD COLUMN IF NOT EXISTS intasend_invoice_id varchar,
  ADD COLUMN IF NOT EXISTS payment_provider text;
CREATE UNIQUE INDEX IF NOT EXISTS giving_records_intasend_invoice_key
  ON public.giving_records (intasend_invoice_id) WHERE intasend_invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider text NOT NULL DEFAULT 'intasend',
  invoice_id varchar NOT NULL,
  state text NOT NULL,
  api_ref varchar,
  tenant_id varchar,
  outcome text NOT NULL,            -- applied | ignored | rejected | unmatched
  detail text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, invoice_id, state)
);
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_events_staff_read ON public.payment_events;
CREATE POLICY payment_events_staff_read ON public.payment_events FOR SELECT TO authenticated
  USING (private.is_platform_super_admin()
         OR (tenant_id IS NOT NULL AND (tenant_id)::text = (private.get_staff_tenant_id())::text
             AND private.can_write_permission((tenant_id)::text, 'financial_records')));

DROP POLICY IF EXISTS giving_records_member_own_read ON public.giving_records;
CREATE POLICY giving_records_member_own_read ON public.giving_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.member_auth_memberships mam
                  WHERE mam.auth_user_id = (SELECT auth.uid())
                    AND (mam.member_id)::text = (giving_records.member_id)::text
                    AND (mam.tenant_id)::text = (giving_records.tenant_id)::text));

-- The giving pages wait for the STK result through a Realtime subscription on
-- the gift row, but giving_records was not published → the listener never
-- fired. Realtime applies RLS, so members only receive their own rows.
DO $pub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'giving_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.giving_records;
  END IF;
END
$pub$;

-- Money routing is a platform decision: only a platform super admin (or the
-- server / service role) may switch IntaSend on or set the settlement wallet.
-- Church admins can still edit every other church setting.
CREATE OR REPLACE FUNCTION private.guard_tenant_payment_routing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF (NEW.intasend_enabled IS DISTINCT FROM OLD.intasend_enabled OR NEW.intasend_wallet_id IS DISTINCT FROM OLD.intasend_wallet_id)
     AND (SELECT auth.uid()) IS NOT NULL AND NOT private.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Only Vestry can change M-Pesa payment routing for a church' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.guard_tenant_payment_routing() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_tenant_payment_routing ON public.tenants;
CREATE TRIGGER guard_tenant_payment_routing BEFORE UPDATE OF intasend_enabled, intasend_wallet_id ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION private.guard_tenant_payment_routing();
