-- Fix OAuth signup by making create_member_for_user function run with elevated privileges
-- This allows it to bypass RLS policies during the signup process

CREATE OR REPLACE FUNCTION create_member_for_user()
RETURNS TRIGGER
SECURITY DEFINER  -- This is the key fix - run with elevated privileges
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create member record linked to user
  INSERT INTO members (
    id, 
    tenant_id, 
    user_id, 
    first_name, 
    last_name, 
    email, 
    phone,
    status, 
    member_type, 
    registration_source, 
    avatar_url,
    join_date, 
    membership_number, 
    created_at, 
    updated_at
  ) VALUES (
    NEW.id,                    -- Same ID as user
    NEW.tenant_id,
    NEW.id,                    -- Link back to user (CRITICAL!)
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
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = NEW.id,  -- Ensure user_id is always set
    member_type = 'member',
    registration_source = 'admin',
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE LOG 'create_member_for_user error for user %: %', NEW.id, SQLERRM;
    -- Re-raise the error so we can see it in logs
    RAISE;
END;
$$;;
