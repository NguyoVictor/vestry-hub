-- Increase VARCHAR column sizes in giving_records table to prevent "value too long" errors
-- This fixes the process-stk-push function failures

ALTER TABLE public.giving_records 
  ALTER COLUMN external_reference TYPE VARCHAR(255),
  ALTER COLUMN donor_name TYPE VARCHAR(255), 
  ALTER COLUMN receipt_number TYPE VARCHAR(255),
  ALTER COLUMN campaign_id TYPE VARCHAR(255),
  ALTER COLUMN fund_id TYPE VARCHAR(255),
  ALTER COLUMN category TYPE VARCHAR(255);

-- Also increase other VARCHAR fields that might cause issues
ALTER TABLE public.giving_records
  ALTER COLUMN mpesa_receipt TYPE VARCHAR(255),
  ALTER COLUMN payhero_reference TYPE VARCHAR(255);

-- Add comment for documentation
COMMENT ON TABLE public.giving_records IS 'Donation records with increased VARCHAR limits to handle longer external references and transaction IDs';