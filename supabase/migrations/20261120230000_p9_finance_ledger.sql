-- Recovery Phase 9 — manual testing report Findings 21, 22, 23, 24.
-- Verified read-only on staging xwbajophstetbnnemsyq, 2026-11-20:
--  F21 Payouts: the form offers payment_method 'cheque' and payment_status
--      'processed'; neither exists in payment_method_enum (cash, mpesa,
--      bank_transfer) / payment_status_enum (pending, confirmed, failed,
--      voided, cancelled) → POST /payouts 400.
--  F22 General Ledger: table chart_of_accounts does not exist (404) while
--      seed_chart_of_accounts() inserts into it; ledger_entries has no account
--      column, so journal lines silently lost their account.
--  F23 Accounts Payable: "Mark as Paid" writes payment_status 'paid' — not an
--      enum value → PATCH 400. The page logic already treats 'paid' as settled.
--  F24 Church Expenses: expenses has SELECT/INSERT policies but NO UPDATE
--      policy → approve/reject update 0 rows, no error, false success toast.
-- Also: payouts / accounts_payable / ledger_entries allowed ANY staff to write
-- (FOR ALL tenant policy) while the pages gate on isReadOnly('financial_records').
-- Writes now require private.can_write_permission(<church>, 'financial_records').
-- Additive; existing rows unchanged.

-- ── Enum values the UI uses (non-breaking additions) ────────────────────────
ALTER TYPE public.payment_status_enum ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.payment_status_enum ADD VALUE IF NOT EXISTS 'processed';
ALTER TYPE public.payment_method_enum ADD VALUE IF NOT EXISTS 'cheque';

-- ── F22 Chart of accounts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_code varchar NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, account_code),
  UNIQUE (id, tenant_id)
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS account_id varchar;
DO $fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ledger_entries'::regclass
                  AND conname = 'ledger_entries_account_tenant_fkey') THEN
    -- Composite FK: a ledger line can only point at an account of the SAME church.
    ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_account_tenant_fkey
      FOREIGN KEY (account_id, tenant_id) REFERENCES public.chart_of_accounts(id, tenant_id);
  END IF;
END
$fk$;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON public.ledger_entries (account_id);

-- Idempotent seeding (clicking Setup twice no longer errors). Runs with the
-- caller's privileges, so RLS limits it to the caller's own church.
CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(p_tenant_id character varying)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO chart_of_accounts (tenant_id, account_name, account_type, account_code, is_default) VALUES
    (p_tenant_id, 'Cash on Hand', 'asset', '1001', true),
    (p_tenant_id, 'Bank Account (General)', 'asset', '1002', true),
    (p_tenant_id, 'Bank Account (Savings)', 'asset', '1003', true),
    (p_tenant_id, 'Accounts Receivable', 'asset', '1100', true),
    (p_tenant_id, 'Prepaid Expenses', 'asset', '1200', true),
    (p_tenant_id, 'Property & Equipment', 'asset', '1500', true),
    (p_tenant_id, 'Accounts Payable', 'liability', '2001', true),
    (p_tenant_id, 'Accrued Expenses', 'liability', '2100', true),
    (p_tenant_id, 'Deferred Revenue', 'liability', '2200', true),
    (p_tenant_id, 'Retained Surplus', 'equity', '3001', true),
    (p_tenant_id, 'Opening Balance Equity', 'equity', '3002', true),
    (p_tenant_id, 'Tithes', 'income', '4001', true),
    (p_tenant_id, 'Offerings', 'income', '4002', true),
    (p_tenant_id, 'Building Fund', 'income', '4003', true),
    (p_tenant_id, 'Donations', 'income', '4004', true),
    (p_tenant_id, 'Event Income', 'income', '4005', true),
    (p_tenant_id, 'Other Income', 'income', '4999', true),
    (p_tenant_id, 'Salaries & Wages', 'expense', '5001', true),
    (p_tenant_id, 'Utilities', 'expense', '5002', true),
    (p_tenant_id, 'Rent', 'expense', '5003', true),
    (p_tenant_id, 'Equipment', 'expense', '5004', true),
    (p_tenant_id, 'Maintenance', 'expense', '5005', true),
    (p_tenant_id, 'Events', 'expense', '5006', true),
    (p_tenant_id, 'Outreach', 'expense', '5007', true),
    (p_tenant_id, 'Supplies', 'expense', '5008', true),
    (p_tenant_id, 'Transport', 'expense', '5009', true),
    (p_tenant_id, 'Other Expenses', 'expense', '5999', true)
  ON CONFLICT (tenant_id, account_code) DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.seed_chart_of_accounts(character varying) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_chart_of_accounts(character varying) TO authenticated;

-- ── RLS: staff read; writes need financial_records write permission ─────────
DROP POLICY IF EXISTS payouts_tenant_rls ON public.payouts;
DROP POLICY IF EXISTS accounts_payable_tenant_rls ON public.accounts_payable;
DROP POLICY IF EXISTS ledger_entries_tenant_rls ON public.ledger_entries;
DO $drop$
DECLARE r record;
BEGIN
  -- Remove the old single FOR ALL / insert / select tenant policies whatever their names.
  FOR r IN SELECT policyname, tablename FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename IN ('payouts', 'accounts_payable', 'ledger_entries', 'expenses')
              AND policyname NOT LIKE '%\_p9\_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$drop$;

DO $p9$
DECLARE t text;
  staff_read text := '(private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text)';
  w text := 'private.can_write_permission((tenant_id)::text, ''financial_records'')';
BEGIN
  FOREACH t IN ARRAY ARRAY['payouts', 'accounts_payable', 'ledger_entries', 'expenses', 'chart_of_accounts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p9_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_p9_read', t, staff_read);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p9_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t || '_p9_insert', t, w);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p9_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t || '_p9_update', t, w, w);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p9_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', t || '_p9_delete', t, w);
  END LOOP;
END
$p9$;
