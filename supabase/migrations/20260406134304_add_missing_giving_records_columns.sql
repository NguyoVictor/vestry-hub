ALTER TABLE public.giving_records
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR,
  ADD COLUMN IF NOT EXISTS fund_id VARCHAR,
  ADD COLUMN IF NOT EXISTS campaign_id VARCHAR,
  ADD COLUMN IF NOT EXISTS donor_name VARCHAR,
  ADD COLUMN IF NOT EXISTS category VARCHAR;
COMMENT ON COLUMN public.giving_records.category IS 'Mirrors giving_type as text for compatibility';
