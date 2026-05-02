-- Fix nullable columns only if they exist
DO $$
BEGIN
  -- password_hash is irrelevant for OAuth users (only if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL';
  END IF;

  -- These should have sensible defaults (only if columns exist)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_enabled') THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN mfa_enabled SET DEFAULT false';
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN mfa_enabled DROP NOT NULL';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN email_verified SET DEFAULT false';
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN email_verified DROP NOT NULL';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN phone_verified SET DEFAULT false';
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN phone_verified DROP NOT NULL';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
