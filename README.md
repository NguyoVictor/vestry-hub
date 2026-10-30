# Vestry Hub — member account activation integration (staging candidate)

Source files from the available Vestry Hub source archive were modified, and the live branch's member-auth source and staging Edge Function were inspected. This is a **code patch bundle**, NOT a deployed change. The GitHub connector rejected creating a branch with `403 Resource not accessible by integration`, so updates were not pushed. Production was untouched.

## Changes prepared

- `src/pages/auth/MemberLogin.tsx`: OTP sign-in with `shouldCreateUser:false`, no client-side admin-table eligibility check, generic public response.
- `src/pages/auth/AuthCallback.tsx`: after verified email callback, use the existing `member-login` server function to validate tenant-specific membership, then create `member_session` only from its verified response. No unauthenticated `tenant_id` redirect.
- `supabase/functions/member-provision-access/index.ts`: new server-side admin-only member invitation function; validates bearer token, checks tenant and member status, and invokes `auth.admin.inviteUserByEmail` without exposing a service key to the browser. Existing identities are not recreated.
- `src/pages/people/Members.tsx`: the existing Send via Email welcome action invokes the secure provisioning Edge Function.
- `src/pages/people/MemberProfile.tsx`: membership approval attempts to invite the approved member.
- `supabase/functions/member-login/index.ts`: accepts `membership_status='Member'` or `'active'`, while still requiring `members.status='active'` and verified Auth email.
- `supabase/functions/member-register/index.ts`: `web_form` registration source instead of invalid `form` value.
- `supabase/migrations/member_registration_web_form_review.sql`: constraint expansion for `web_form` — apply via normal reviewed migration process.

## Mandatory staging review / config before deployment

1. **Set staging Edge Function secret** `MEMBER_AUTH_REDIRECT_ORIGINS` to a comma-separated exact allowlist, including `http://127.0.0.1:4173` and approved staging application URLs. The invite function rejects unknown origins. Supabase Auth redirect URL allowlist must include the callback URL as well.
2. Review existing account creation triggers/hooks. In particular, a new invited member should not create a second church or grant an admin role. Do not modify another tenant's `public.users` record.
3. Verify invitation link callback in staging, including PKCE/session behavior; the callback now calls `member-login` with the authenticated JWT and requires the validated member session before redirecting.
4. Review email-provider availability and add a retry button for existing member invitations if required. Existing identities must use sign-in magic links rather than repeated `inviteUserByEmail` calls.
5. Review `member_sessions` authorization, client Data API/RLS and all portal write actions. Server-side session validation must be enforced for access to member data, not just frontend route guards.
6. Deploy the migration and Edge Functions to **staging only**, in a controlled order, then run regression tests for new member, invited member, existing Auth identity, pending member, wrong tenant, and admin without membership.
7. The test environment needs authenticated QA browser sessions. No live authenticated end-to-end testing was performed in this environment.

## Validation performed

- Inspected relevant React code and deployed staging `member-login` function.
- Verified staging constraint permits `qr_scan, admin, invite_email, invite_sms` only.
- Confirmed staging has `member-login` and `member-register` deployed, but not `member-provision-access`.
- Build could not be run in the available source archive because dependencies are not installed and the container cannot access npm network.

## Security

Never ship the `SUPABASE_SERVICE_ROLE_KEY` inside Vite/frontend files. Never deploy the patch to production before authorization and staging end-to-end validation.
