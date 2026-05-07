-- Fix the auto member creation triggers to properly handle OAuth data and link users to members

-- Update the user creation function to better handle OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Create user profile row (with avatar support)
  INSERT INTO public.users (
    id, tenant_id, email,
    first_name, last_name,
    role, status, avatar_url,
    join_date, created_at, updated_at
  ) VALUES (
    NEW.id::text,
    v_tenant_id,
    NEW.email,
    v_first_name,
    v_last_name,
    'super_admin', 'active',
    (NEW.raw_user_meta_data->>'avatar_url'),
    v_now::date, v_now, v_now
  );

  RETURN NEW;
END;
$$;

-- Update the member creation function to properly link user_id and include avatar
CREATE OR REPLACE FUNCTION create_member_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO members (
    id, tenant_id, user_id, first_name, last_name, email, phone,
    status, member_type, registration_source, avatar_url,
    join_date, membership_number, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    NEW.id,  -- Link member back to user (this is crucial!)
    NEW.first_name,
    NEW.last_name,
    NEW.email,
    NEW.phone,
    CASE WHEN NEW.status = 'active' THEN 'active' ELSE 'inactive' END,
    'member',
    'admin',
    NEW.avatar_url,
    COALESCE(NEW.join_date, CURRENT_DATE),
    'MEM-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)) || '-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 4)),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS auto_create_member ON users;
CREATE TRIGGER auto_create_member
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_member_for_user();