ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS daraja_consumer_key TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS daraja_consumer_secret TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS daraja_passkey TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS daraja_transaction_type TEXT DEFAULT 'CustomerPayBillOnline';
