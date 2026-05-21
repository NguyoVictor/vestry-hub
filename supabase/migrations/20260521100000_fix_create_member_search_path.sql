-- Fix create_member_for_user function search path issue
-- The function has SECURITY DEFINER but was missing SET search_path = public
-- This caused "relation 'members' does not exist" errors during OAuth signup

CREATE OR REPLACE FUNCTION create_member_for_user()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with elevated privileges to bypass RLS
SET search_path = public  -- This is the critical fix - ensure we look in public schema
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create member record linked to user
  INSERT INTO public.members (
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
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS auto_create_member_trigger ON public.users;
CREATE TRIGGER auto_create_member_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_member_for_user();

-- Grant necessary permissions
GRANT INSERT, UPDATE ON public.members TO postgres;