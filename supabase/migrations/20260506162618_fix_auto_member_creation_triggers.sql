-- Fix the auto member creation triggers
-- This ensures future admin signups automatically get member records

-- 1. Improved member creation function
CREATE OR REPLACE FUNCTION create_member_for_user()
RETURNS TRIGGER AS $$
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
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure trigger is properly set up
DROP TRIGGER IF EXISTS auto_create_member ON users;
CREATE TRIGGER auto_create_member
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_member_for_user();

-- 3. Test that trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'auto_create_member';;
