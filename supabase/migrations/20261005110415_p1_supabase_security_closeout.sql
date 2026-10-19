-- Phase 1 Stage 8: Supabase security closeout.
-- Keep server-only tables inaccessible to browser roles and remove direct
-- execution of private SECURITY DEFINER trigger functions from browser roles.

revoke all on table public.automation_settings from public, anon, authenticated;
revoke all on table public.member_login_challenges from public, anon, authenticated;
revoke all on table public.staff_invitations from public, anon, authenticated;
revoke all on table public.tenant_payment_credentials from public, anon, authenticated;
revoke all on table public.webhook_events from public, anon, authenticated;

grant select, insert, update, delete on table public.automation_settings to service_role;
grant select, insert, update, delete on table public.member_login_challenges to service_role;
grant select, insert, update, delete on table public.staff_invitations to service_role;
grant select, insert, update, delete on table public.tenant_payment_credentials to service_role;
grant select, insert, update, delete on table public.webhook_events to service_role;

revoke execute on function private.enforce_event_rsvp_capacity() from public, anon, authenticated;
revoke execute on function private.prevent_facility_booking_overlap() from public, anon, authenticated;
revoke execute on function private.refresh_volunteer_role_count() from public, anon, authenticated;
revoke execute on function private.set_facility_booking_number() from public, anon, authenticated;
