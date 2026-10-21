
-- =====================================================
-- FACILITY BOOKING ENHANCEMENT
-- Migration: 20260409115721
-- =====================================================
--
-- This migration overlaps with 20260409000001.
-- Schema changes are idempotent.
-- Existing RLS policies are preserved.
-- =====================================================

-- 1. Add quotation column to facilities
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS quotation NUMERIC;

-- 2. Add booker identity columns
ALTER TABLE public.facility_bookings
  ADD COLUMN IF NOT EXISTS booker_type VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_name VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_org_name VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_contact_person VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_phone VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_email VARCHAR;

-- 3. Create booking responses table if absent
CREATE TABLE IF NOT EXISTS public.facility_booking_responses (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL,
  booking_id VARCHAR
    REFERENCES public.facility_bookings(id) ON DELETE CASCADE,
  channel VARCHAR NOT NULL
    CHECK (channel IN ('email', 'sms')),
  from_address VARCHAR,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create tenant index
CREATE INDEX IF NOT EXISTS idx_facility_booking_responses_tenant_id
  ON public.facility_booking_responses (tenant_id);

-- 5. Enable RLS
ALTER TABLE public.facility_booking_responses
  ENABLE ROW LEVEL SECURITY;

-- 6. Create policies only when they do not already exist
DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facility_booking_responses'
      AND policyname = 'tenant_read_facility_booking_responses'
  ) THEN
    CREATE POLICY "tenant_read_facility_booking_responses"
      ON public.facility_booking_responses
      FOR SELECT
      USING (
        tenant_id::text = get_my_tenant_id()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facility_booking_responses'
      AND policyname = 'tenant_insert_facility_booking_responses'
  ) THEN
    CREATE POLICY "tenant_insert_facility_booking_responses"
      ON public.facility_booking_responses
      FOR INSERT
      WITH CHECK (
        tenant_id::text = get_my_tenant_id()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facility_booking_responses'
      AND policyname = 'tenant_update_facility_booking_responses'
  ) THEN
    CREATE POLICY "tenant_update_facility_booking_responses"
      ON public.facility_booking_responses
      FOR UPDATE
      USING (
        tenant_id::text = get_my_tenant_id()::text
      )
      WITH CHECK (
        tenant_id::text = get_my_tenant_id()::text
      );
  END IF;

END
$$;
