-- Recovery Phase 10 — product items: budget utilisation, payroll staff
-- management; Finding 27 tax rates. Verified on staging 2026-11-20.
--
-- Budget: "Spent" was computed in the browser by summing EVERY approved
-- expense whose category TEXT matched a budget line — across all budgets and
-- periods (double counting), with no way to record spend, no history, no
-- reversal, no audit. This adds:
--   * budget_expenditures — every spend is a traceable row; never deleted or
--     edited, only REVERSED (reason + who/when). (source_type, source_id) is
--     unique, so an expense / payable / ledger line can count only ONCE.
--   * approved expenses with a budget line become expenditures automatically
--     (and are reversed if un-approved) — no double entry by hand.
--   * budget_categories.spent_amount maintained server-side.
--   * budget_audit_log — every change to budgets / budget lines / expenditures.
-- Payroll: payroll_staff writes aligned to financial_records (page gate).
-- Finding 27: tax_rates (name, percentage, description, inclusive/exclusive,
-- active) per church — configuration only; NOT auto-applied to giving,
-- expenses or other records (per the report).
-- Additive; existing rows unchanged (staging: 1 budget, 1 line, 0 linked expenses).

-- ── Budget expenditures ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_expenditures (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  budget_id varchar NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  budget_category_id varchar REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  expenditure_date date NOT NULL DEFAULT current_date,
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  reference text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'expense', 'accounts_payable', 'ledger_entry')),
  source_id varchar,
  created_by varchar DEFAULT (auth.uid())::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_by varchar,
  reversal_reason text,
  CHECK ((source_type = 'manual') = (source_id IS NULL))
);
-- A source counts at most once among ACTIVE (non-reversed) expenditures;
-- reversed rows stay as history.
CREATE UNIQUE INDEX IF NOT EXISTS budget_expenditures_one_active_source
  ON public.budget_expenditures (source_type, source_id) WHERE source_id IS NOT NULL AND reversed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budget_expenditures_line ON public.budget_expenditures (budget_category_id) WHERE reversed_at IS NULL;
ALTER TABLE public.budget_expenditures ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.budget_audit_log (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL,
  entity text NOT NULL,
  entity_id varchar NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_by varchar DEFAULT (auth.uid())::text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_budget_audit_tenant ON public.budget_audit_log (tenant_id, changed_at DESC);
ALTER TABLE public.budget_audit_log ENABLE ROW LEVEL SECURITY;

-- Integrity: budget belongs to the church; line belongs to the budget; an
-- expenditure's facts can never be edited — only reversal fields may change.
CREATE OR REPLACE FUNCTION private.budget_expenditure_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = NEW.budget_id AND (b.tenant_id)::text = (NEW.tenant_id)::text) THEN
      RAISE EXCEPTION 'Budget does not belong to this church' USING ERRCODE = '23514';
    END IF;
    IF NEW.budget_category_id IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.budget_categories c WHERE c.id = NEW.budget_category_id AND c.budget_id = NEW.budget_id) THEN
      RAISE EXCEPTION 'Budget line does not belong to this budget' USING ERRCODE = '23514';
    END IF;
    NEW.reversed_at := NULL; NEW.reversed_by := NULL; NEW.reversal_reason := NULL;
    RETURN NEW;
  END IF;
  -- UPDATE: only reversal is allowed, once.
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.expenditure_date IS DISTINCT FROM OLD.expenditure_date
     OR NEW.description IS DISTINCT FROM OLD.description OR NEW.budget_id IS DISTINCT FROM OLD.budget_id
     OR NEW.budget_category_id IS DISTINCT FROM OLD.budget_category_id OR NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.source_id IS DISTINCT FROM OLD.source_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Expenditures cannot be edited — reverse it and record a new one' USING ERRCODE = '23514';
  END IF;
  IF OLD.reversed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This expenditure is already reversed' USING ERRCODE = '23514';
  END IF;
  IF NEW.reversed_at IS NOT NULL THEN
    IF coalesce(btrim(NEW.reversal_reason), '') = '' THEN
      RAISE EXCEPTION 'A reversal reason is required' USING ERRCODE = '23514';
    END IF;
    NEW.reversed_by := (SELECT auth.uid())::text;
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.budget_expenditure_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS budget_expenditure_guard ON public.budget_expenditures;
CREATE TRIGGER budget_expenditure_guard BEFORE INSERT OR UPDATE ON public.budget_expenditures
  FOR EACH ROW EXECUTE FUNCTION private.budget_expenditure_guard();

-- Keep budget_categories.spent_amount = sum of non-reversed expenditures.
CREATE OR REPLACE FUNCTION private.budget_line_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE line text;
BEGIN
  FOREACH line IN ARRAY ARRAY[NEW.budget_category_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.budget_category_id END] LOOP
    IF line IS NOT NULL THEN
      UPDATE public.budget_categories c
         SET spent_amount = coalesce((SELECT sum(e.amount) FROM public.budget_expenditures e
                                       WHERE e.budget_category_id = line AND e.reversed_at IS NULL), 0)
       WHERE c.id = line;
    END IF;
  END LOOP;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION private.budget_line_recalc() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS budget_line_recalc ON public.budget_expenditures;
CREATE TRIGGER budget_line_recalc AFTER INSERT OR UPDATE ON public.budget_expenditures
  FOR EACH ROW EXECUTE FUNCTION private.budget_line_recalc();

-- Approved expenses linked to a budget line count automatically (once).
CREATE OR REPLACE FUNCTION private.expense_budget_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE b varchar;
BEGIN
  IF NEW.budget_category_id IS NOT NULL AND NEW.approval_status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'approved' OR OLD.budget_category_id IS DISTINCT FROM NEW.budget_category_id) THEN
    SELECT c.budget_id INTO b FROM public.budget_categories c
      JOIN public.budgets bu ON bu.id = c.budget_id
     WHERE c.id = NEW.budget_category_id AND (bu.tenant_id)::text = (NEW.tenant_id)::text;
    IF b IS NOT NULL THEN
      UPDATE public.budget_expenditures SET reversed_at = now(), reversal_reason = 'Expense re-linked to another budget line'
       WHERE source_type = 'expense' AND source_id = NEW.id AND reversed_at IS NULL
         AND budget_category_id IS DISTINCT FROM NEW.budget_category_id;
      INSERT INTO public.budget_expenditures (tenant_id, budget_id, budget_category_id, amount, expenditure_date, description, reference, source_type, source_id, created_by)
      VALUES (NEW.tenant_id, b, NEW.budget_category_id, NEW.amount, coalesce(NEW.expense_date, current_date),
              coalesce(nullif(btrim(NEW.title), ''), nullif(btrim(NEW.description), ''), 'Approved expense'),
              NEW.payment_reference, 'expense', NEW.id, NEW.approved_by)
      ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL AND reversed_at IS NULL DO NOTHING;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.approval_status = 'approved' AND NEW.approval_status IS DISTINCT FROM 'approved' THEN
    UPDATE public.budget_expenditures SET reversed_at = now(), reversal_reason = 'Expense no longer approved'
     WHERE source_type = 'expense' AND source_id = NEW.id AND reversed_at IS NULL;
  END IF;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION private.expense_budget_sync() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS expense_budget_sync ON public.expenses;
CREATE TRIGGER expense_budget_sync AFTER INSERT OR UPDATE OF approval_status, budget_category_id, amount ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION private.expense_budget_sync();

-- Audit trail for budgets, budget lines and expenditures.
CREATE OR REPLACE FUNCTION private.budget_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE t varchar; rec jsonb;
BEGIN
  rec := to_jsonb(coalesce(NEW, OLD));
  t := rec->>'tenant_id';
  IF t IS NULL AND TG_TABLE_NAME = 'budget_categories' THEN
    SELECT b.tenant_id INTO t FROM public.budgets b WHERE b.id = rec->>'budget_id';
  END IF;
  IF t IS NOT NULL THEN
    INSERT INTO public.budget_audit_log (tenant_id, entity, entity_id, action, old_data, new_data)
    VALUES (t, TG_TABLE_NAME, rec->>'id', lower(TG_OP),
            CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END, CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  END IF;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION private.budget_audit() FROM PUBLIC, anon, authenticated;
DO $aud$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['budgets', 'budget_categories', 'budget_expenditures'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_audit', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.budget_audit()', t || '_audit', t);
  END LOOP;
END
$aud$;

-- ── Finding 27: tax rates ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  percentage numeric(6, 3) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  description text,
  is_inclusive boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar DEFAULT (auth.uid())::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;

-- ── RLS ─────────────────────────────────────────────────────────────────────
DO $drop$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
            AND tablename IN ('budgets', 'budget_categories', 'payroll_staff') AND policyname NOT LIKE '%\_p10\_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$drop$;

DO $p10$
DECLARE r record; c text; staff_read text; w text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('budgets', '(tenant_id)::text', 'financial_records', 'iud'),
      ('budget_categories', '(SELECT (b.tenant_id)::text FROM public.budgets b WHERE b.id = budget_categories.budget_id)', 'financial_records', 'iud'),
      ('budget_expenditures', '(tenant_id)::text', 'financial_records', 'iu'),
      ('budget_audit_log', '(tenant_id)::text', NULL, ''),
      ('payroll_staff', '(tenant_id)::text', 'financial_records', 'iud'),
      ('tax_rates', '(tenant_id)::text', 'church_settings', 'iud')
    ) AS v(tbl, col, key, ops)
  LOOP
    c := r.col;
    staff_read := format('(private.is_platform_super_admin() OR %s = (private.get_staff_tenant_id())::text)', c);
    w := format('private.can_write_permission(%s, %L)', c, r.key);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p10_read', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', r.tbl || '_p10_read', r.tbl, staff_read);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p10_insert', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p10_update', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p10_delete', r.tbl);
    IF position('i' in r.ops) > 0 THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', r.tbl || '_p10_insert', r.tbl, w);
    END IF;
    IF position('u' in r.ops) > 0 THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', r.tbl || '_p10_update', r.tbl, w, w);
    END IF;
    IF position('d' in r.ops) > 0 THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', r.tbl || '_p10_delete', r.tbl, w);
    END IF;
  END LOOP;
END
$p10$;
