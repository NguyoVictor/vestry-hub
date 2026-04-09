-- ─── Facility Booking Enhancement Migration ───────────────────────────────────
-- Adds quotation to facilities, booker identity fields to facility_bookings,
-- and creates the facility_booking_responses table.

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
