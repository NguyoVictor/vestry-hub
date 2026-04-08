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

  -- Parse full name from metadata
  v_full_name  := COALESCE((NEW.raw_user_meta_data->>'full_name'), (NEW.raw_user_meta_data->>'name'), '');
  v_first_name := COALESCE(NULLIF(split_part(v_full_name, ' ', 1), ''), 'Admin');
  v_last_name  := COALESCE(NULLIF(trim(substring(v_full_name FROM position(' ' IN v_full_name) + 1)), ''), 'User');

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

  -- Create user profile row
  INSERT INTO public.users (
    id, tenant_id, email,
    first_name, last_name,
    role, status,
    mfa_enabled, email_verified, phone_verified,
    join_date, created_at, updated_at
  ) VALUES (
    NEW.id::text,
    v_tenant_id,
    NEW.email,
    v_first_name,
    v_last_name,
    'super_admin', 'active',
    false, true, false,
    v_now::date, v_now, v_now
  );

  RETURN NEW;
END;
$$;;
