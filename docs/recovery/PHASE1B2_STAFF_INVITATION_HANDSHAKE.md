# Phase 1B.2 - Secure staff invitation handshake (review and gated implementation)

- **Branch:** `recovery/system-stabilization-2026-11` (no merge to `main`)
- **Staging project:** `xwbajophstetbnnemsyq`
- **Current status:** Prepared implementation and unit tests. **NO migration, account creation, invitation email, or Edge Function deployment has been performed.**
- **Trigger target:** existing `public.handle_new_user()` invoked by `on_auth_user_created` on `auth.users`.

## Root cause (read-only verified on staging)

The live `send-invitation` Edge Function calls `auth.admin.inviteUserByEmail` and only *afterwards* tries to create `public.users`. However, the live `auth.users` trigger creates a staff profile for an existing church only if `raw_app_meta_data.staff_invitation_id` matches a server-created row in `staff_invitations`. Supabase's invite API accepts `data` as **user_metadata**, not app_metadata, and the deployed Edge Function did not pre-create the invitation row. The trigger can therefore follow its new-church fallback before the Edge Function can insert the correct staff profile. We have not reproduced this on shared staging because that would write data and send email.

## Files in this package

1. `supabase/functions/send-invitation/index.ts` - replaces the invitation endpoint with authorization, preview redirect, migration marker, trusted-row-first ordering and postcondition checks. **Not deployed by installing this ZIP.**
2. `supabase/functions/send-invitation/handshake.ts` - pure validation of redirect origin and persisted invitation/profile linkage.
3. `docs/recovery/sql/PHASE1B2_STAFF_INVITATION_TRIGGER_REVIEW.sql` - **review-only SQL**, guarded patch to the existing trigger plus service-role-only handshake marker. **Not a migration file and not executed.**
4. `scripts/recovery/check-staff-invite-handshake.mjs` - read-only contract and local InviteCallback source check.
5. `scripts/recovery/staff-invite-handshake.node.test.mjs` - dependency-free security regression tests.
6. This document.

## Live security constraints retained

- A signed-in, server-verified, active `super_admin` or `church_admin` may invite staff to their own tenant; the existing platform-admin exception is still server-verified.
- Only supported roles such as `staff` can be invited. There is no role or tenant authorization from `raw_user_meta_data`.
- `public.users` is keyed by the Auth user ID across tenants: never upsert or reassign an existing identity to a different church.
- Duplicate existing users and pending invitations are rejected. If two invitations race, the DB trigger fails closed on ambiguous matches.
- An administrator-approved `staff_invitations` record is created *before* `inviteUserByEmail`. The Auth trigger claims that record if the new Auth user has an `invited_at` timestamp and a matching unconsumed, unexpired, unique email-bound invitation. The database row supplies tenant and role.
- An Auth invitation that lacks the trusted row fails closed, rather than creating an unintended church. The existing trusted `raw_app_meta_data.staff_invitation_id` and member-login-challenge branches are preserved.
- The Edge Function refuses to issue invitations until `public.staff_invitation_handshake_version()` returns `1`. This SQL marker is denied to anon/authenticated roles and executable only by the service role.
- The Edge Function verifies the Auth ID, the claimed invitation, tenant, role, normalized email, and resulting active `users` profile before reporting success.
- Auth invitation failure may leave a pending invitation: **do not automatically delete** a newly created Auth identity or invitation when delivery/creation outcome is uncertain. Investigate and recover manually.
- The redirect is a *server-side* `STAFF_INVITATION_REDIRECT_ORIGIN` set to an exact HTTPS `.vercel.app` Preview origin, not a URL chosen by a browser or a default Production alias.

## Mandatory local source/callback review (before commit)

Your local, uncommitted `src/pages/auth/InviteCallback.tsx`, `src/pages/auth/inviteCallbackGuards.ts` and `src/test/p1/people/inviteCallbackSecurity.test.ts` must be reviewed separately. This package intentionally **does not overwrite them**. The old GitHub callback does unauthorized `users`/`members` upserts from user metadata. The local hardened version should validate the persisted server-issued profile using `supabase.auth.getUser()` and should never upsert tenant/role fields.

```bash
node scripts/recovery/check-staff-invite-handshake.mjs
node --experimental-strip-types --test scripts/recovery/staff-invite-handshake.node.test.mjs
npx vitest run src/test/p1/people/inviteCallbackSecurity.test.ts
npx tsc --noEmit
npm run build
git diff --check
git diff -- src/pages/auth/InviteCallback.tsx
```

The source check **intentionally fails** until the local hardened callback and guard are present. If the callback test fails, do not commit or deploy. Do not overwrite an existing uncommitted callback file from this package.

## Before any migration or cloud deployment (future explicit authorization)

1. Do not run the SQL file directly now. Check the actual function definition on staging, migration history, the Auth trigger owner, and staging backup/restore availability. A Postgres function error can block *all* new user signups, so rehearse against a disposable restored environment first.
2. Create a proper timestamped migration using the locally installed Supabase CLI from the repository root: `supabase migration new p1b2_staff_invite_handshake`. Verify the generated file path and copy the **reviewed** `docs/recovery/sql/PHASE1B2_STAFF_INVITATION_TRIGGER_REVIEW.sql` content into that new file. Never invent a migration filename. This requires explicit approval; the installer deliberately doesn't do it.
3. Have a qualified reviewer inspect the dynamic `pg_get_functiondef()` patch, expected source guards, the `SECURITY DEFINER` trigger, the service-role-only marker permissions and the impact on onboarding. Stop if the live trigger differs. Run Supabase security advisors.
4. Freeze staff invitations and any other Auth invite operations for the change window. Deploy the DB migration **before** the new Edge Function. An old invitation without a trusted row will then fail closed, not create a new tenant.
5. Set the staging Edge Function secret `STAFF_INVITATION_REDIRECT_ORIGIN` to the **exact current Recovery Preview origin**. Confirm this origin + `/auth/invite` are approved in Supabase Auth redirect allowlist. The Supabase URL Configuration must not fall back to Production. Vercel Preview Deployment Protection must be accessible to the authorized test mailbox operator.
6. Deploy only `send-invitation` to staging after the DB patch and marker pass review. **Do not** deploy to Production or change `supabase/config.toml` project linkage without an approved plan.
7. With explicit approval for one tester-controlled inbox, run ONE small staging canary invitation and record BEFORE/AFTER counts of `tenants`, `auth.users`, `users`, `members`, and `staff_invitations`. Assert exactly one invited account joined the authorized existing tenant, no new tenant, no existing account moved, no role escalation and no erroneous duplicated account. Inspect failures without deleting unrelated records.
8. Repeat for Church B only after Church A canary and invitation callback acceptance are independently verified. Member-only provisioning remains a separate Phase 1B.2 task.

## Git commit boundary

Commit only the six packaged files plus the **three local callback safety files** if independently reviewed and passing their tests. Do NOT stage unrelated `.gitignore`, `allow_staff_invitation_roles.sql`, local ZIPs, Playwright reports, test results, or any other changes. The old callback from GitHub must NOT be promoted with a live invitation flow.

The key deliverable for this patch is safe, reviewable code and a gated migration plan. Until staged DB migration and Edge Function are independently deployed and canary-tested, **staff invitations remain blocked**. A green source test is *not* proof of a working invitation or changed database trigger.
