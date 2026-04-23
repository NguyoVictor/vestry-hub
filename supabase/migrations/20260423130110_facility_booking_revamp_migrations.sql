-- 1. facility_types table
CREATE TABLE IF NOT EXISTS facility_types (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facility_types_tenant_id ON facility_types(tenant_id);
ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "facility_types_tenant_rls" ON facility_types;
CREATE POLICY "facility_types_tenant_rls" ON facility_types FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
DROP POLICY IF EXISTS "facility_types_public_read" ON facility_types;
CREATE POLICY "facility_types_public_read" ON facility_types FOR SELECT TO anon USING (true);

-- 2. facility_images table
CREATE TABLE IF NOT EXISTS facility_images (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  facility_id VARCHAR NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  tenant_id VARCHAR NOT NULL,
  image_path VARCHAR NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facility_images_facility_id ON facility_images(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_images_tenant_id ON facility_images(tenant_id);
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "facility_images_tenant_rls" ON facility_images;
CREATE POLICY "facility_images_tenant_rls" ON facility_images FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
DROP POLICY IF EXISTS "facility_images_public_read" ON facility_images;
CREATE POLICY "facility_images_public_read" ON facility_images FOR SELECT TO anon USING (true);

-- 3. facility_responses table
CREATE TABLE IF NOT EXISTS facility_responses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL,
  facility_id VARCHAR REFERENCES facilities(id) ON DELETE SET NULL,
  respondent_name VARCHAR NOT NULL,
  respondent_email VARCHAR,
  respondent_phone VARCHAR,
  respondent_org VARCHAR,
  message TEXT NOT NULL,
  source VARCHAR NOT NULL DEFAULT 'external' CHECK (source IN ('in_app','external','email','sms','whatsapp')),
  status VARCHAR NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','converted')),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facility_responses_tenant_id ON facility_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facility_responses_facility_id ON facility_responses(facility_id);
ALTER TABLE facility_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "facility_responses_tenant_rls" ON facility_responses;
CREATE POLICY "facility_responses_tenant_rls" ON facility_responses FOR ALL USING (tenant_id::text = get_my_tenant_id()::text);
DROP POLICY IF EXISTS "facility_responses_public_insert" ON facility_responses;
CREATE POLICY "facility_responses_public_insert" ON facility_responses FOR INSERT TO anon WITH CHECK (true);

-- 4. Add columns to facility_bookings
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS booking_number VARCHAR;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS source VARCHAR NOT NULL DEFAULT 'admin';
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS external_name VARCHAR;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS external_email VARCHAR;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS external_phone VARCHAR;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS external_org VARCHAR;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR;

-- 5. Booking number sequence and trigger
CREATE SEQUENCE IF NOT EXISTS facility_booking_number_seq START 1;
CREATE OR REPLACE FUNCTION set_facility_booking_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := 'BK-' || LPAD(nextval('facility_booking_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_facility_booking_number ON facility_bookings;
CREATE TRIGGER trg_facility_booking_number
  BEFORE INSERT ON facility_bookings
  FOR EACH ROW EXECUTE FUNCTION set_facility_booking_number();

-- 6. Public insert policy for facility_bookings (external bookers)
DROP POLICY IF EXISTS "facility_bookings_public_insert" ON facility_bookings;
CREATE POLICY "facility_bookings_public_insert" ON facility_bookings FOR INSERT TO anon WITH CHECK (source = 'external');

-- 7. Public read for facilities (public booking page)
DROP POLICY IF EXISTS "facilities_public_read" ON facilities;
CREATE POLICY "facilities_public_read" ON facilities FOR SELECT TO anon USING (true);

-- 8. Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('facility-images', 'facility-images', true, 5242880)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('facility-videos', 'facility-videos', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "facility_images_upload" ON storage.objects;
CREATE POLICY "facility_images_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facility-images');
DROP POLICY IF EXISTS "facility_images_public_read" ON storage.objects;
CREATE POLICY "facility_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'facility-images');
DROP POLICY IF EXISTS "facility_videos_upload" ON storage.objects;
CREATE POLICY "facility_videos_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facility-videos');
DROP POLICY IF EXISTS "facility_videos_read" ON storage.objects;
CREATE POLICY "facility_videos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'facility-videos');;
