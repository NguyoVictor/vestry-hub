
-- ============================================================
-- SUBSCRIPTION SYSTEM FOUNDATION
-- Migration: 20260601120000
-- ============================================================
-- Establishes tenant_subscriptions and billing_history.
-- Subscription entitlements are server-managed.
-- Tenant users receive read-only access to their own records.
-- ============================================================

-- 1. Tenant subscriptions

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,

    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',

    member_limit INTEGER NOT NULL DEFAULT 100,
    staff_limit INTEGER NOT NULL DEFAULT 3,
    branch_limit INTEGER NOT NULL DEFAULT 1,
    storage_limit_gb NUMERIC NOT NULL DEFAULT 2,

    sms_credits INTEGER NOT NULL DEFAULT 0,
    email_credits INTEGER NOT NULL DEFAULT 100,
    ai_credits INTEGER NOT NULL DEFAULT 0,

    sms_used INTEGER NOT NULL DEFAULT 0,
    email_used INTEGER NOT NULL DEFAULT 0,
    ai_used INTEGER NOT NULL DEFAULT 0,

    member_addons INTEGER NOT NULL DEFAULT 0,
    sms_addons INTEGER NOT NULL DEFAULT 0,
    email_addons INTEGER NOT NULL DEFAULT 0,
    ai_addons INTEGER NOT NULL DEFAULT 0,
    storage_addons_gb NUMERIC NOT NULL DEFAULT 0,
    storage_used_gb NUMERIC NOT NULL DEFAULT 0,

    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tenant_subscriptions_plan_not_empty
        CHECK (length(trim(plan)) > 0),

    CONSTRAINT tenant_subscriptions_nonnegative_credits
        CHECK (
            sms_credits >= 0
            AND email_credits >= 0
            AND ai_credits >= 0
            AND sms_used >= 0
            AND email_used >= 0
            AND ai_used >= 0
        )
);

-- 2. Billing history

CREATE TABLE IF NOT EXISTS public.billing_history (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    tenant_id VARCHAR NOT NULL
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,

    transaction_type VARCHAR NOT NULL
        CHECK (
            transaction_type IN (
                'subscription',
                'addon',
                'upgrade',
                'downgrade'
            )
        ),

    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    payment_method VARCHAR DEFAULT 'mpesa',
    payment_reference VARCHAR,

    payment_status VARCHAR NOT NULL DEFAULT 'pending'
        CHECK (
            payment_status IN (
                'pending',
                'completed',
                'failed',
                'refunded'
            )
        ),

    plan_purchased VARCHAR,
    addon_type VARCHAR,
    addon_quantity INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id
    ON public.tenant_subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan
    ON public.tenant_subscriptions(plan);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status
    ON public.tenant_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan_status
    ON public.tenant_subscriptions(plan, status);

CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_id
    ON public.billing_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_created
    ON public.billing_history(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_status
    ON public.billing_history(tenant_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_billing_history_payment_status
    ON public.billing_history(payment_status);

-- 4. Enable row-level security

ALTER TABLE public.tenant_subscriptions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.billing_history
    ENABLE ROW LEVEL SECURITY;

-- 5. Remove earlier policy names

DROP POLICY IF EXISTS
    "Users can view their tenant subscription"
    ON public.tenant_subscriptions;

DROP POLICY IF EXISTS
    "Users can update their tenant subscription"
    ON public.tenant_subscriptions;

DROP POLICY IF EXISTS
    "Users can view their tenant billing history"
    ON public.billing_history;

DROP POLICY IF EXISTS subscription_select
    ON public.tenant_subscriptions;

DROP POLICY IF EXISTS subscription_update
    ON public.tenant_subscriptions;

DROP POLICY IF EXISTS subscription_insert
    ON public.tenant_subscriptions;

DROP POLICY IF EXISTS billing_history_select
    ON public.billing_history;

DROP POLICY IF EXISTS billing_history_insert
    ON public.billing_history;

-- 6. Restrict table privileges

REVOKE ALL ON public.tenant_subscriptions
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.billing_history
    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.tenant_subscriptions
    TO authenticated;

GRANT SELECT ON public.billing_history
    TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.tenant_subscriptions
    TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.billing_history
    TO service_role;

-- 7. Tenant-scoped subscription read access

CREATE POLICY subscription_select
ON public.tenant_subscriptions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id::TEXT = (SELECT auth.uid())::TEXT
          AND u.tenant_id::TEXT =
              tenant_subscriptions.tenant_id::TEXT
    )
);

-- No browser INSERT or UPDATE policy:
-- plan upgrades, credits and limits are server-managed.

-- 8. Tenant-scoped billing history access

CREATE POLICY billing_history_select
ON public.billing_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id::TEXT = (SELECT auth.uid())::TEXT
          AND u.tenant_id::TEXT =
              billing_history.tenant_id::TEXT
    )
);

-- No browser INSERT or UPDATE policy for billing history.

-- 9. Initialize free subscriptions for existing tenants
-- Only valid UUID-formatted tenant IDs are eligible.

INSERT INTO public.tenant_subscriptions (
    tenant_id,
    plan,
    status,
    member_limit,
    staff_limit,
    branch_limit,
    storage_limit_gb,
    sms_credits,
    email_credits,
    ai_credits
)
SELECT
    t.id::UUID,
    'free',
    'active',
    100,
    3,
    1,
    2,
    0,
    100,
    0
FROM public.tenants AS t
WHERE t.id::TEXT ~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (tenant_id) DO NOTHING;

-- 10. Updated-at trigger function

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS
    update_billing_history_updated_at
    ON public.billing_history;

CREATE TRIGGER update_billing_history_updated_at
BEFORE UPDATE ON public.billing_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS
    update_tenant_subscriptions_updated_at
    ON public.tenant_subscriptions;

CREATE TRIGGER update_tenant_subscriptions_updated_at
BEFORE UPDATE ON public.tenant_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Validation

DO $validation$
BEGIN
    IF to_regclass('public.tenant_subscriptions') IS NULL THEN
        RAISE EXCEPTION
            'tenant_subscriptions table was not created';
    END IF;

    IF to_regclass('public.billing_history') IS NULL THEN
        RAISE EXCEPTION
            'billing_history table was not created';
    END IF;

    RAISE NOTICE
        'Subscription system foundation created successfully';
END;
$validation$;
