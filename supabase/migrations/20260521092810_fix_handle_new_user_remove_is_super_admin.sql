-- Fix handle_new_user function by removing non-existent is_super_admin column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id  varchar;
  v_church_code varchar;
  v_full_name  text;
  v_first_name varchar;
  v_last_name  varchar;
  v_now        timestamptz;
BEGIN
  -- Skip if user profile already exists (idempotent)
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id::text) THEN
    RETURN NEW;
  END IF;

  v_now        := now();
  v_tenant_id  := gen_random_uuid()::text;
  v_church_code := upper(substring(md5(random()::text) FROM 1 FOR 4) || substring(md5(random()::text) FROM 1 FOR 4));

  -- Parse full name from metadata (improved OAuth support)
  v_full_name  := COALESCE(
    (NEW.raw_user_meta_data->>'full_name'), 
    (NEW.raw_user_meta_data->>'name'),
    ''
  );
  v_first_name := COALESCE(
    (NEW.raw_user_meta_data->>'given_name'),
    split_part(v_full_name, ' ', 1), 
    'Admin'
  );
  v_last_name  := COALESCE(
    (NEW.raw_user_meta_data->>'family_name'),
    NULLIF(trim(substring(v_full_name FROM position(' ' IN v_full_name) + 1)), ''), 
    'User'
  );

  -- Create tenant row
  INSERT INTO public.tenants (
    id, slug, name, church_code,
    subscription_plan, subscription_tier, subscription_status,
    onboarding_completed, onboarding_step,
    created_at, updated_at
  ) VALUES (
    v_tenant_id,
    lower(v_church_code),
    v_first_name || '''s Church',
    v_church_code,
    'free', 'free', 'trial',
    false, 0,
    v_now, v_now
  );

  -- Create user profile row (FIXED: removed is_super_admin column)
  INSERT INTO public.users (
    id, 
    tenant_id, 
    email,
    first_name, 
    last_name,
    role, 
    status, 
    avatar_url,
    join_date, 
    created_at, 
    updated_at,
    email_verified
  ) VALUES (
    NEW.id::text,
    v_tenant_id,
    COALESCE(NEW.email, ''),
    v_first_name,
    v_last_name,
    'super_admin', 
    'active',
    COALESCE((NEW.raw_user_meta_data->>'avatar_url'), (NEW.raw_user_meta_data->>'picture')),
    v_now::date, 
    v_now, 
    v_now,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE LOG 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    -- Re-raise the error so we can see it in logs
    RAISE;
END;
$$;;
