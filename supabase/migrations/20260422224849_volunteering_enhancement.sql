
-- ============================================================
-- VOLUNTEERING ENHANCEMENT AND MISSING TABLE FOUNDATIONS
-- Migration: 20260422224849
-- ============================================================
--
-- Restore volunteer_roles and volunteers based on the
-- original production schema before applying enhancements.
--
-- Do not introduce unrestricted anonymous access.
-- ============================================================

-- 1. Restore volunteer_roles

CREATE TABLE IF NOT EXISTS public.volunteer_roles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id VARCHAR NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    department VARCHAR,
    description TEXT,
    required_skills TEXT[],
    min_volunteers INTEGER DEFAULT 1,
    max_volunteers INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_roles_tenant
    ON public.volunteer_roles(tenant_id);

ALTER TABLE public.volunteer_roles
    ENABLE ROW LEVEL SECURITY;


-- 2. Restore volunteers

CREATE TABLE IF NOT EXISTS public.volunteers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id VARCHAR NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id VARCHAR NOT NULL,
    role_id VARCHAR
        REFERENCES public.volunteer_roles(id) ON DELETE SET NULL,
    reference_type VARCHAR
        CHECK (reference_type IN ('event', 'service')),
    reference_id VARCHAR,
    status VARCHAR DEFAULT 'confirmed'
        CHECK (status IN (
            'confirmed',
            'pending',
            'completed',
            'no_show'
        )),
    hours_served NUMERIC DEFAULT 0,
    notes TEXT,
    assigned_by VARCHAR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_tenant
    ON public.volunteers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_volunteers_member
    ON public.volunteers(member_id);

CREATE INDEX IF NOT EXISTS idx_volunteers_role
    ON public.volunteers(role_id);

ALTER TABLE public.volunteers
    ENABLE ROW LEVEL SECURITY;


-- 3. Apply the original volunteering enhancements

ALTER TABLE public.volunteer_roles
    ADD COLUMN IF NOT EXISTS requirements TEXT,
    ADD COLUMN IF NOT EXISTS time_commitment TEXT,
    ADD COLUMN IF NOT EXISTS department_color TEXT;

ALTER TABLE public.volunteers
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();


-- 4. Create volunteer_hours

CREATE TABLE IF NOT EXISTS public.volunteer_hours (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,

    tenant_id VARCHAR NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,

    assignment_id VARCHAR
        REFERENCES public.volunteers(id) ON DELETE SET NULL,

    volunteer_member_id VARCHAR NOT NULL,

    role_id VARCHAR
        REFERENCES public.volunteer_roles(id) ON DELETE SET NULL,

    hours DECIMAL(6,2) NOT NULL DEFAULT 0,

    activity_description TEXT,

    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,

    logged_by VARCHAR
        REFERENCES public.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_hours_tenant
    ON public.volunteer_hours(tenant_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_hours_member
    ON public.volunteer_hours(volunteer_member_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_hours_role
    ON public.volunteer_hours(role_id);

ALTER TABLE public.volunteer_hours
    ENABLE ROW LEVEL SECURITY;


-- 5. Temporary tenant-scoped staff policies
-- The later operations reconciliation will replace these
-- with the application's role-aware access policies.

DROP POLICY IF EXISTS volunteer_roles_tenant_rls
    ON public.volunteer_roles;

CREATE POLICY volunteer_roles_tenant_rls
    ON public.volunteer_roles
    FOR ALL TO authenticated
    USING (
        tenant_id::text = public.get_my_tenant_id()::text
    )
    WITH CHECK (
        tenant_id::text = public.get_my_tenant_id()::text
    );

DROP POLICY IF EXISTS volunteers_tenant_rls
    ON public.volunteers;

CREATE POLICY volunteers_tenant_rls
    ON public.volunteers
    FOR ALL TO authenticated
    USING (
        tenant_id::text = public.get_my_tenant_id()::text
    )
    WITH CHECK (
        tenant_id::text = public.get_my_tenant_id()::text
    );

DROP POLICY IF EXISTS volunteer_hours_tenant_rls
    ON public.volunteer_hours;

CREATE POLICY volunteer_hours_tenant_rls
    ON public.volunteer_hours
    FOR ALL TO authenticated
    USING (
        tenant_id::text = public.get_my_tenant_id()::text
    )
    WITH CHECK (
        tenant_id::text = public.get_my_tenant_id()::text
    );


-- 6. Remove unsafe legacy anonymous policies if present

DROP POLICY IF EXISTS volunteer_roles_public_read
    ON public.volunteer_roles;

DROP POLICY IF EXISTS volunteers_public_read
    ON public.volunteers;

DROP POLICY IF EXISTS volunteers_public_insert
    ON public.volunteers;

DROP POLICY IF EXISTS volunteers_public_delete
    ON public.volunteers;
