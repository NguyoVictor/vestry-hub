-- Review and migrate through your standard Supabase migration workflow before deploying member-register.
-- Existing constraint allows only qr_scan/admin/invite_email/invite_sms.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_registration_source_check;
ALTER TABLE public.members ADD CONSTRAINT members_registration_source_check
CHECK (registration_source = ANY (ARRAY['qr_scan','admin','invite_email','invite_sms','web_form']::text[]));
