-- Auto-create a members row whenever a new user is inserted
CREATE OR REPLACE FUNCTION create_member_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO members (
    id, tenant_id, first_name, last_name, email, phone,
    status, member_type, registration_source,
    join_date, membership_number, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    NEW.first_name,
    NEW.last_name,
    NEW.email,
    NEW.phone,
    CASE WHEN NEW.status = 'active' THEN 'active' ELSE 'inactive' END,
    'member',
    'admin',
    COALESCE(NEW.join_date, CURRENT_DATE),
    'MEM-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)) || '-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 4)),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_member ON users;
CREATE TRIGGER auto_create_member
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_member_for_user();;
