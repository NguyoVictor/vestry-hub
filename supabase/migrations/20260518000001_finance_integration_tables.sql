
-- ============================================================
-- FINANCE INTEGRATION TABLES
-- Migration: 20260518000001
-- ============================================================
-- Reconciles missing payroll_runs schema.
-- Preserves existing payroll_records, payroll_staff,
-- and staff_payroll tables.
--
-- Payroll tables are RLS protected and server-only
-- until explicit tenant-scoped user policies are audited.
-- ============================================================

-- 1. Payroll processing runs
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id VARCHAR NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    staff_count INTEGER NOT NULL DEFAULT 0,
    total_gross NUMERIC NOT NULL DEFAULT 0,
    total_deductions NUMERIC NOT NULL DEFAULT 0,
    total_net NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    processed_at TIMESTAMPTZ,
    processed_by VARCHAR,
    journal_entry_id VARCHAR,
    completed_at TIMESTAMPTZ,

    CONSTRAINT payroll_runs_month_valid
        CHECK (period_month BETWEEN 1 AND 12),

    CONSTRAINT payroll_runs_staff_count_valid
        CHECK (staff_count >= 0)
);

-- 2. Backfill missing columns if the table
-- already exists in another environment.
ALTER TABLE public.payroll_runs
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS journal_entry_id VARCHAR,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS processed_by VARCHAR;

-- 3. Payroll line items
CREATE TABLE IF NOT EXISTS public.payroll_run_lines (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    run_id VARCHAR REFERENCES public.payroll_runs(id),
    staff_id VARCHAR,
    gross_amount NUMERIC,
    net_amount NUMERIC,
    payment_method VARCHAR(20),
    payout_status VARCHAR(20) DEFAULT 'pending',
    payhero_reference VARCHAR(50),
    paid_at TIMESTAMPTZ
);

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_id
    ON public.payroll_runs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status
    ON public.payroll_runs(status);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_period
    ON public.payroll_runs(
        tenant_id,
        period_year,
        period_month
    );

CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_run_id
    ON public.payroll_run_lines(run_id);

-- 5. Row-level security
ALTER TABLE public.payroll_runs
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payroll_run_lines
    ENABLE ROW LEVEL SECURITY;

-- Remove legacy policies based on the client-controllable
-- app.current_tenant_id session setting.
DROP POLICY IF EXISTS
    "Users can view their tenant's payroll run lines"
    ON public.payroll_run_lines;

DROP POLICY IF EXISTS
    "Users can manage their tenant's payroll run lines"
    ON public.payroll_run_lines;

-- Do not expose sensitive payroll data directly to
-- authenticated or anonymous roles until authorization
-- requirements are verified.

REVOKE ALL ON public.payroll_runs
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.payroll_run_lines
    FROM PUBLIC, anon, authenticated;

-- 6. Finance journal helper
CREATE OR REPLACE FUNCTION public.post_auto_journal_entry(
    p_tenant_id VARCHAR,
    p_description TEXT,
    p_reference VARCHAR,
    p_date DATE,
    p_lines JSONB
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $finance$
DECLARE
    v_entry_id VARCHAR;
BEGIN
    INSERT INTO public.journal_entries (
        tenant_id,
        description,
        reference,
        date,
        posted_by
    )
    VALUES (
        p_tenant_id,
        p_description,
        p_reference,
        p_date,
        'system'
    )
    RETURNING id INTO v_entry_id;

    INSERT INTO public.journal_lines (
        entry_id,
        account,
        debit,
        credit
    )
    SELECT
        v_entry_id,
        line->>'account',
        (line->>'debit')::NUMERIC,
        (line->>'credit')::NUMERIC
    FROM jsonb_array_elements(p_lines) AS line;

    RETURN v_entry_id;
END;
$finance$;

-- Do not allow arbitrary callers to submit another
-- tenant's ID to the finance journal helper.
REVOKE ALL ON FUNCTION public.post_auto_journal_entry(
    VARCHAR,
    TEXT,
    VARCHAR,
    DATE,
    JSONB
) FROM PUBLIC, anon, authenticated;

-- 7. Documentation
COMMENT ON TABLE public.payroll_runs IS
    'Tenant-scoped payroll processing batches';

COMMENT ON TABLE public.payroll_run_lines IS
    'Individual payroll line items linked to processing runs';

-- 8. Validation
DO $validation$
BEGIN
    IF to_regclass('public.payroll_runs') IS NULL THEN
        RAISE EXCEPTION 'payroll_runs was not created';
    END IF;

    IF to_regclass('public.payroll_run_lines') IS NULL THEN
        RAISE EXCEPTION 'payroll_run_lines was not created';
    END IF;

    RAISE NOTICE
        'Finance integration payroll tables created successfully';
END;
$validation$;
