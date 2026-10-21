-- ─── Facility Booking Enhancement Migration ───────────────────────────────────
-- Adds quotation to facilities, booker identity fields to facility_bookings,
-- and creates the facility_booking_responses table.
-- =====================================================
-- Restore missing facilities table foundation
-- Based on the existing production schema
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facilities (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,

    tenant_id VARCHAR NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    type VARCHAR DEFAULT 'other',

    capacity INTEGER,

    description TEXT,

    amenities TEXT[],

    photo_url TEXT,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),

    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security before any API access.
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Permit tenant-scoped access for authenticated users.
-- Reuses the tenant helper employed elsewhere in the schema.
DROP POLICY IF EXISTS facilities_tenant_rls
ON public.facilities;

CREATE POLICY facilities_tenant_rls
ON public.facilities
FOR ALL
TO authenticated
USING (
    tenant_id::text = public.get_my_tenant_id()::text
)
WITH CHECK (
    tenant_id::text = public.get_my_tenant_id()::text
);

CREATE INDEX IF NOT EXISTS idx_facilities_tenant_id
ON public.facilities(tenant_id);
-- 1. Add quotation column to facilities
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS quotation NUMERIC;
-- 2. Add booker identity columns to facility_bookings
ALTER TABLE facility_bookings
  ADD COLUMN IF NOT EXISTS booker_type VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_name VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_org_name VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_contact_person VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_phone VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_email VARCHAR;
-- 3. Create facility_booking_responses table
CREATE TABLE IF NOT EXISTS facility_booking_responses (
  id            VARCHAR PRIMARY KEY,
  tenant_id     VARCHAR NOT NULL,
  booking_id    VARCHAR REFERENCES facility_bookings(id) ON DELETE CASCADE,
  channel       VARCHAR NOT NULL CHECK (channel IN ('email', 'sms')),
  from_address  VARCHAR,
  body          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 4. Index on tenant_id for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_facility_booking_responses_tenant_id
  ON facility_booking_responses (tenant_id);
-- 5. Enable RLS
ALTER TABLE facility_booking_responses ENABLE ROW LEVEL SECURITY;
-- 6. RLS policies — tenant-scoped read
CREATE POLICY "tenant_read_facility_booking_responses"
  ON facility_booking_responses
  FOR SELECT
  USING ((tenant_id)::text = (get_my_tenant_id())::text);
-- 7. RLS policies — tenant-scoped insert
CREATE POLICY "tenant_insert_facility_booking_responses"
  ON facility_booking_responses
  FOR INSERT
  WITH CHECK ((tenant_id)::text = (get_my_tenant_id())::text);
-- 8. RLS policies — tenant-scoped update (for marking as read)
CREATE POLICY "tenant_update_facility_booking_responses"
  ON facility_booking_responses
  FOR UPDATE
  USING ((tenant_id)::text = (get_my_tenant_id())::text);
