
-- ============================================================
-- BOARD MEETINGS: MINUTES, DECISIONS, ACTION ITEMS & ATTENDEES
-- Migration: 20260423093155
-- ============================================================
--
-- Restores missing board meeting tables and adds enhancements.
--
-- The role-aware permission functions in the private schema
-- are not yet available at this point in migration history.
-- Therefore, meeting_action_items and meeting_attendees have
-- RLS enabled but no access policies in this migration.
--
-- Their role-aware policies must be restored after the
-- private authorization functions are available.
-- ============================================================


-- ============================================================
-- 1. MEETING MINUTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_minutes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR NOT NULL
        REFERENCES public.board_meetings(id) ON DELETE CASCADE,
    tenant_id VARCHAR NOT NULL,
    minutes_text TEXT DEFAULT '',
    created_by VARCHAR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_minutes_meeting
    ON public.meeting_minutes(meeting_id);

ALTER TABLE public.meeting_minutes
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_minutes_tenant_rls"
    ON public.meeting_minutes;

CREATE POLICY "meeting_minutes_tenant_rls"
    ON public.meeting_minutes
    FOR ALL
    USING (
        tenant_id::text = get_my_tenant_id()::text
    )
    WITH CHECK (
        tenant_id::text = get_my_tenant_id()::text
    );


-- ============================================================
-- 2. MEETING DECISIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_decisions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR NOT NULL
        REFERENCES public.board_meetings(id) ON DELETE CASCADE,
    tenant_id VARCHAR NOT NULL,
    decision_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting
    ON public.meeting_decisions(meeting_id);

ALTER TABLE public.meeting_decisions
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_decisions_tenant_rls"
    ON public.meeting_decisions;

CREATE POLICY "meeting_decisions_tenant_rls"
    ON public.meeting_decisions
    FOR ALL
    USING (
        tenant_id::text = get_my_tenant_id()::text
    )
    WITH CHECK (
        tenant_id::text = get_my_tenant_id()::text
    );


-- ============================================================
-- 3. MEETING ACTION ITEMS
-- Restore original table from production column definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_action_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR,
    due_date DATE,
    status VARCHAR DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    tenant_id VARCHAR NOT NULL,
    task_description TEXT
);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_id
    ON public.meeting_action_items(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_tenant_id
    ON public.meeting_action_items(tenant_id);

ALTER TABLE public.meeting_action_items
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. MEETING ATTENDEES
-- Restore original table from production column definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id VARCHAR NOT NULL,
    member_id VARCHAR NOT NULL,
    attendance_status VARCHAR DEFAULT 'expected',
    tenant_id VARCHAR NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id
    ON public.meeting_attendees(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_tenant_id
    ON public.meeting_attendees(tenant_id);

ALTER TABLE public.meeting_attendees
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. ENSURE REQUIRED COLUMNS EXIST
-- Preserve the original migration enhancements
-- ============================================================

ALTER TABLE public.meeting_action_items
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;

ALTER TABLE public.meeting_action_items
    ADD COLUMN IF NOT EXISTS task_description TEXT;

-- Backfill task descriptions for existing records.
UPDATE public.meeting_action_items
SET task_description = description
WHERE task_description IS NULL;

ALTER TABLE public.meeting_attendees
    ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT true;

ALTER TABLE public.meeting_attendees
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR;


-- ============================================================
-- 6. BOARD MEETING SECURITY
-- ============================================================
--
-- Row Level Security is enabled on:
--
--   meeting_minutes
--   meeting_decisions
--   meeting_action_items
--   meeting_attendees
--
-- meeting_minutes and meeting_decisions use the existing
-- tenant-scoped get_my_tenant_id() policy.
--
-- meeting_action_items and meeting_attendees intentionally
-- have no policies here because the private schema and
-- role-aware authorization functions do not yet exist.
--
-- With RLS enabled and no applicable policies, ordinary
-- application roles cannot read or modify these tables.
--
-- After the private authorization functions are created,
-- restore role-aware policies for:
--
--   private.can_read_board_meetings(tenant_id)
--   private.can_manage_board_meetings(tenant_id)
--
-- These must be validated before production deployment.
-- ============================================================
