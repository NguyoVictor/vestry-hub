# Phase 1B.2 - QA accounts: read-only preparation and provisioning gate

**Branch:** `recovery/system-stabilization-2026-11`  
**Supabase staging project:** `xwbajophstetbnnemsyq`  
**Status:** Preparation complete; account creation NOT AUTHORIZED by this package.

## Scope and confirmed state (read-only, 2026-11-18)

| Tenant | Tenant ID | Existing staff | Existing members | Member-only accounts | Open staff invites | Staff slots remaining (estimated) |
|---|---|---:|---:|---:|---:|---:|
| Vestry Staging Church A | `20d06ab3-5183-4b0b-b1af-ca009480503b` | 1 `super_admin` | 1 (same ID as admin) | 0 | 0 | 2 |
| Vestry Staging Church B | `db75d0c0-ec9c-406e-a386-a690725b654f` | 1 `super_admin` | 1 (same ID as admin) | 0 | 0 | 2 |
| Vestry Isolated QA 20261025 | `cf36ddf8-ec05-4378-845a-64dc3c23df1e` | 0 | 0 | 0 | 0 | Not evaluated |

Both existing administrators have corresponding confirmed Supabase Auth identities and evidence of previous sign-in. Their public `users.email_verified` flags are false, a status-consistency issue to investigate separately. Church A/B registration is enabled. No production or database records were modified for this audit. All three tenants reside in ONE staging Supabase project, not separate disposable databases.

## Planned identities (not credentials)

| Alias | Tenant | Account type | `public.users` role | `public.members` state | Auth requirement |
|---|---|---|---|---|---|
| A-STAFF | Church A | Ordinary staff | `staff` | Auto-created linked member row may be expected | Invitation accepted, verified email |
| B-STAFF | Church B | Ordinary staff | `staff` | Auto-created linked member row may be expected | Invitation accepted, verified email |
| A-MEMBER | Church A | Member only | No staff user row | `member_type=member`, `status=active`, `membership_status=active` | Activated and verified email |
| B-MEMBER | Church B | Member only | No staff user row | `member_type=member`, `status=active`, `membership_status=active` | Activated and verified email |

Use four UNIQUE, reachable, tester-controlled inboxes. Do not reuse an existing staff/member Auth email, share OTPs or sessions, paste keys into chat, or put actual addresses into the repository. Labels above are identifiers for a private allocation sheet, not suggested email addresses. Confirm no address is already present in ANY church's `public.users`, `public.members`, `public.staff_invitations`, or `auth.users` before any invitations. Get the user's explicit approval for each identity and its tenant/role before doing anything that sends email or writes data.

## CRITICAL BLOCKER - Staff invitation/trigger mismatch

The DEPLOYED `send-invitation` Edge Function (version 1) verifies the inviter's Supabase Auth JWT and `users` role/tenant, validates `staff`, checks duplicate `public.users` email and staff limit, then invokes `auth.admin.inviteUserByEmail(email, { data: { tenant_id, role, ... } })` and inserts `public.users` afterward. The `data` object represents user metadata, not trusted application metadata.

The LIVE `on_auth_user_created` database trigger (`public.handle_new_user`) checks `raw_app_meta_data.staff_invitation_id` and matches a nonexpired row in `public.staff_invitations` BEFORE it assigns a user to an existing church. The deployed invitation function neither sets that trusted app-metadata invitation ID nor writes the required invitation row. Its Auth invite call can therefore run the trigger's fallback NEW-TENANT creation path before it attempts `public.users` insert, causing a duplicate/profile conflict and potentially an unintended tenant. This is a static mismatch, not a reproduced live attempt. **Do not send staff invitations or manually create Auth users until this handshake is repaired and verified.** Do not fix by trusting unvalidated user-supplied tenant/role metadata or inserting directly into `auth.users`.

The committed `src/pages/auth/InviteCallback.tsx` also uses `user_metadata` for tenant and role and performs client-side upserts. The local working tree contains an UNCOMMITTED security-guard edit to this file. Preserve it and review its diff/tests before integration; do not overwrite it with any provisioning package. Check `members_registration_source_check` (only `qr_scan`, `admin`, `invite_email`, `invite_sms`, `web_form` are accepted) and never use `admin_invite` as a registration_source value.

## Preflight gates for STAFF accounts (no writes yet)

1. Review and reconcile the GitHub and deployed `send-invitation` code with the LIVE Auth trigger, including a server-verified invitation ID and a trusted, tenant-bound role decision. Never authorize by `user_metadata.role`.
2. Confirm a callback cannot change church or role from user metadata; account state is persisted server-side and secured by RLS and the existing `protect_user_security_fields` trigger.
3. Validate the full invitation flow offline (success, wrong tenant, unauthenticated, duplicate email, expired invitation, failure after email delivery, one invite cannot join a different tenant). Test actual staging invitation only after approved.
4. Verify `SITE_URL` and allowed email redirect URLs point to a nonproduction Preview and that Auth redirects never land on `vestryhub.com` by default. The deployed function otherwise falls back to `https://vestryhub.com`.
5. Check quotas immediately before invitation: each test tenant currently has one active staff member and uses the default effective limit of three (`staff_limit` NULL); expected capacity is two additional staff accounts per tenant.
6. When approved, create only one `staff` invitation per church through an explicitly verified server-side flow. Review postconditions: exactly one correct Auth identity and `public.users` staff row, NO new tenant, NO changed existing user, and expected linked member row where applicable.

## Preflight gates for MEMBER-only accounts (no writes yet)

1. Use a tenant-authorized administrator to create an appropriately ACTIVE member record through an audited People/admin flow. Do not use direct SQL as a workaround. Public `member-register` creates a `Pending Approval` record and may require an additional approved step.
2. Use the deployed `member-provision-access` authorization flow only after reviewing `MEMBER_AUTH_REDIRECT_ORIGINS` and the intended Preview callback. The function requires the operator to be an active `super_admin` of the same tenant, creates a 10-minute tenant/member/email-bound login challenge, then sends an invite. The live Auth trigger recognizes this challenge before its new-tenant fallback.
3. Never call `supabase.auth.signInWithOtp` in a mode that silently creates an unapproved Auth user. The Phase 1B.1 login uses `shouldCreateUser: false`; that is correct.
4. Confirm the member record belongs to the intended tenant, there is exactly one correct Auth identity/membership link, no staff role was assigned, and no extra church was created.
5. For the subsequent Phase 1B.3 authenticated tests, use distinct browser sessions and an explicitly approved set of writes; NEVER reuse admin sessions as member-only test sessions.

## Read-only verification

Run the SELECT-only queries from `scripts/qa/phase1b2-account-readiness.sql` in the staging Supabase SQL Editor. Do not copy query outputs with emails, access codes, tokens, or personal information into public logs. This script intentionally does not include provisioning DML or account identities.

## Before any provisioning is approved

- Have four private, reachable mailbox identities ready (one per A-STAFF/B-STAFF/A-MEMBER/B-MEMBER).
- Confirm no mailbox is already used as an Auth user or a user/member of any tenant.
- Resolve the staff invitation trigger mismatch and review local `InviteCallback.tsx` changes FIRST.
- Validate the staging-only redirect target and staff-identity quotas; ensure backups and restore procedures are available.
- Specify exactly who is allowed to send a real invitation, with a rollback policy that does not delete unrelated accounts or tenants.
- Require explicit user approval before any database write, Auth invite, SMTP send, or deployment.

**Do not** run this package against Production. It makes no database changes, does not invoke Edge Functions, does not create users, and does not push to GitHub.
