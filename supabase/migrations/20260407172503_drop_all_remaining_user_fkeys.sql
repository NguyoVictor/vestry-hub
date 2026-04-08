-- Drop all remaining FK constraints that point to users.id
-- These break when members are created via the new members-table flow
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_pastor_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_head_of_household_id_fkey;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_leader_id_fkey;
ALTER TABLE member_requests DROP CONSTRAINT IF EXISTS member_requests_member_id_fkey;
ALTER TABLE member_requests DROP CONSTRAINT IF EXISTS member_requests_assigned_to_fkey;
ALTER TABLE new_converts DROP CONSTRAINT IF EXISTS new_converts_member_id_fkey;
ALTER TABLE new_converts DROP CONSTRAINT IF EXISTS new_converts_counsellor_id_fkey;
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_created_by_fkey;
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_converted_to_member_id_fkey;;
