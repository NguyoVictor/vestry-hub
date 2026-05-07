# Testing Auto Member Creation for New Admin Accounts

## Current Implementation Status

The Vestry Hub system already has automatic member creation implemented through database triggers:

### 1. User Creation Trigger (`handle_new_user()`)
- **Location**: `supabase/migrations/20260318150856_on_auth_user_created_trigger.sql`
- **Trigger**: `on_auth_user_created` on `auth.users` table
- **Function**: Creates tenant and user profile when someone signs up

### 2. Member Creation Trigger (`create_member_for_user()`)
- **Location**: `supabase/migrations/20260407111520_auto_create_member_for_user.sql`
- **Trigger**: `auto_create_member` on `users` table
- **Function**: Creates member record when user profile is created

## How It Works

1. **User Signs Up** (Email or Google OAuth)
   - `auth.users` record created by Supabase Auth
   
2. **Tenant & User Profile Created**
   - `handle_new_user()` trigger fires
   - Creates `tenants` record (new church)
   - Creates `users` record (user profile)
   - Extracts name from OAuth metadata
   
3. **Member Record Created**
   - `create_member_for_user()` trigger fires
   - Creates `members` record
   - Links `members.user_id` to `users.id`
   - Copies user data to member profile

## Key Improvements Made

### Enhanced OAuth Data Extraction
- Supports both `full_name` and `name` from OAuth
- Extracts `given_name` and `family_name` for better parsing
- Includes `avatar_url` from Google profile

### Proper User-Member Linking
- Sets `members.user_id = users.id` to link records
- Admin appears in Members page with full profile
- Maintains relationship for member portal access

### Complete Profile Data
- Copies: first_name, last_name, email, phone, avatar_url
- Sets: member_type='member', registration_source='admin'
- Generates: unique membership_number

## Testing the Implementation

To verify this works:

1. **Create New Account**
   - Sign up with email or Google OAuth
   - Complete onboarding process

2. **Check Members Page**
   - Navigate to People > Members
   - Admin should appear in member list
   - Profile should include OAuth data (name, avatar)

3. **Verify Database Records**
   ```sql
   -- Check user record
   SELECT * FROM users WHERE email = 'admin@example.com';
   
   -- Check linked member record
   SELECT * FROM members WHERE user_id = 'user_id_from_above';
   ```

## Expected Behavior

✅ **Admin automatically added to Members page**
✅ **OAuth data (name, avatar) properly extracted**
✅ **Member record linked to user account**
✅ **Membership number auto-generated**
✅ **Works for both email and Google OAuth signup**

## Migration Status

The fixes have been prepared in:
- `supabase/migrations/20260506000001_fix_auto_member_creation.sql`

This migration improves:
- OAuth data extraction (Google profile fields)
- Avatar URL support
- Proper user-member linking
- Error handling and idempotency

## Next Steps

1. Apply the migration when database access is available
2. Test with new account creation
3. Verify member appears in Members page
4. Confirm OAuth data is properly extracted

The system should now automatically add any new admin to the Members page with their complete profile information from either email signup or Google OAuth.