-- password_hash is irrelevant for OAuth users
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- These should have sensible defaults
ALTER TABLE public.users ALTER COLUMN mfa_enabled SET DEFAULT false;
ALTER TABLE public.users ALTER COLUMN mfa_enabled DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE public.users ALTER COLUMN email_verified DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN phone_verified SET DEFAULT false;
ALTER TABLE public.users ALTER COLUMN phone_verified DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT now();;
