-- Create member record for admin user
-- This will definitely add you to the members list

-- Step 1: Create the member record for the admin
DO $$
DECLARE
    admin_user_record RECORD;
    new_membership_number TEXT;
BEGIN
    -- Get the admin user record
    SELECT * INTO admin_user_record
    FROM users 
    WHERE role = 'super_admin' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Check if admin user exists
    IF admin_user_record.id IS NULL THEN
        RAISE NOTICE 'No super_admin user found';
        RETURN;
    END IF;
    
    -- Generate membership number
    new_membership_number := 'MEM-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT)) || '-' || UPPER(SUBSTRING(admin_user_record.id::TEXT, 1, 4));
    
    -- Create member record if it doesn't exist
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
        admin_user_record.id,
        admin_user_record.tenant_id,
        admin_user_record.id,  -- This links the member to the user
        COALESCE(admin_user_record.first_name, 'Admin'),
        COALESCE(admin_user_record.last_name, 'User'),
        admin_user_record.email,
        admin_user_record.phone,
        COALESCE(admin_user_record.status, 'active'),
        'member',
        'admin',
        admin_user_record.avatar_url,
        COALESCE(admin_user_record.join_date, CURRENT_DATE),
        new_membership_number,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        user_id = admin_user_record.id,  -- Ensure user_id is set
        first_name = COALESCE(admin_user_record.first_name, 'Admin'),
        last_name = COALESCE(admin_user_record.last_name, 'User'),
        email = admin_user_record.email,
        member_type = 'member',
        registration_source = 'admin',
        updated_at = NOW();
    
    RAISE NOTICE 'Member record created/updated for user: %', admin_user_record.email;
END $$;

-- Step 2: Verify the member was created
SELECT 
    u.email as admin_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    u.role,
    m.id as member_id,
    m.user_id,
    m.first_name as member_first_name,
    m.last_name as member_last_name,
    m.membership_number,
    m.member_type,
    m.registration_source,
    m.created_at as member_created
FROM users u
LEFT JOIN members m ON u.id = m.user_id
WHERE u.role = 'super_admin'
ORDER BY u.created_at DESC;

-- Step 3: Check all members in your tenant
SELECT 
    id,
    user_id,
    first_name,
    last_name,
    email,
    membership_number,
    member_type,
    registration_source,
    created_at
FROM members 
WHERE tenant_id = (
    SELECT tenant_id FROM users WHERE role = 'super_admin' LIMIT 1
)
ORDER BY created_at DESC;