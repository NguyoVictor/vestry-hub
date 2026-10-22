-- Ensure tenant subscription columns exist.
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR DEFAULT 'free';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'trial';

-- Ensure staff invitation tracking exists.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS invitation_sent BOOLEAN NOT NULL DEFAULT FALSE;