# Vestry member authentication staging hotfix v2

This bundle replaces only the three Supabase Edge Functions in the earlier patch.
The frontend files in the original patch remain unchanged.
The database migration was already applied successfully on staging.

Critical fixes:
- member-register preserves tenants.registration_enabled = true guard
- member-register uses the actual public.members.address column; fixes web_form registration_source
- member-provision-access creates member_login_challenges with tenant/member/email before inviting
- invitation metadata includes member_login_challenge_id so handle_new_user() does not create an unintended new church/super_admin
- member-login retains verified JWT and tenant-scoped membership checks

To overlay: unzip -o ~/Downloads/vestry-member-auth-staging-v2.zip -d .
Do not deploy to production.
Before using member-provision-access, set staging MEMBER_AUTH_REDIRECT_ORIGINS secret to include exact origin http://127.0.0.1:4173 and permit /auth/callback in Auth redirect URL settings.
The invitation flow is not end-to-end validated until test inbox activation succeeds.
