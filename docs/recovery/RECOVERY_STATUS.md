# Vestry Hub — Live recovery status / checkpoint

**Branch:** `recovery/system-stabilization-2026-11` (no other branches; no merge to `main` until Gate A)
**Staging (only approved write target):** Supabase `xwbajophstetbnnemsyq` (vestry-hub-staging). `churchapp` `crjdsxxkspvdwknrmijs` and real Production are OFF LIMITS.
**Status vocabulary:** UNVERIFIED / REPRODUCED / ROOT_CAUSE_CONFIRMED / FIXED_LOCALLY / AUTOMATED_TEST_PASS / STAGING_TEST_PASS / ACCEPTED / BLOCKED.
**Last updated:** 2026-11-20 (Claude Code session 2 — re-verified live state)

## Phase dashboard

| Phase | Scope | Status | Evidence | Commit | Open items |
|---|---|---|---|---|---|
| 0 | Environment safety / baseline | PARTIAL | Linked CLI ref = staging (verified 19 Nov); full staging dump waived by user | earlier | Disposable QA project; Production backup (Gate B) |
| 1 | Credible CI | PARTIAL | `tsc --noEmit` in CI uses root tsconfig with `files: []` → checks nothing (see F-CI-1) | — | Point CI at `tsc -p tsconfig.app.json` once clean |
| 1B.2 | Staff invitation handshake | **STAGING_TEST_PASS** — V2 fix (D-1) deployed 20 Nov; Church A + B canaries and isolation passed | see §1B.2 | pending | Church A then B staff canary (human inbox + admin session) |
| 2 (1B.3) | Finding 1 member-only provisioning + OTP | FIXED_LOCALLY, AUTOMATED_TEST_PASS, **not deployed** | see §2 | pending | Staging deploy after 1B.2 canaries; A/B member canaries |
| 3–10 | Findings 2–27 + product items | PENDING | — | — | — |
| 11 | Full staging acceptance | PENDING | — | — | — |
| A / B | Final merge / Production | NOT AUTHORIZED | — | — | — |

## 2026-11-20 re-verification (read-only)

| Check | Result |
|---|---|
| Git | branch `recovery/system-stabilization-2026-11`; local HEAD = origin = `7897c99`; uncommitted work preserved |
| Linked Supabase ref | `xwbajophstetbnnemsyq` (`supabase/.temp/project-ref`); `config.toml` still labels `crjdsxxkspvdwknrmijs` (ignored) |
| Staging counts | tenants 11, auth.users 11, public.users 10, members 14, staff_invitations 0, member_auth_memberships 1 (unchanged since 19 Nov) |
| Trigger / marker | patch present; marker EXECUTE anon=false, authenticated=false |
| Edge functions | `send-invitation` v3 verify_jwt=true; `member-provision-access` v3, `member-login` v6, `member-session-context` v5, `member-register` v7 (Phase 2 versions still old, as expected) |
| Migration history | `20261119101722` paired local/remote; `db push --dry-run --linked` would push only `20261119114430_p2_member_portal_provisioning.sql` (Phase 2, intentionally not yet applied) |
| PAT incident | CLOSED — user confirmed revocation (USER_DECISIONS_2026-11-20) |

### RELEASE-MAPPING HAZARD R-1 (blocks Gate A; report to user)
Live Production domains (`vestryhub.com`, `www.`, `app.`, `*.vestryhub.com`, `vestry-hub.vercel.app`) are served by Vercel Production deployment `vestry-8kz2190on…` (built 12 Nov from `main`). Read-only bundle inspection:
- `main`'s `src/integrations/supabase/client.ts` **hardcodes `https://crjdsxxkspvdwknrmijs.supabase.co` (churchapp)** — so the live app currently talks to **churchapp**, which is therefore effectively the live Production backend.
- The Vercel env var `VITE_SUPABASE_URL` is a single value scoped to **Production AND Preview** and equals **staging** (`xwbajophstetbnnemsyq`). `main` ignores it today; the recovery branch's client reads it.
- **Consequence:** merging the recovery branch to `main` unchanged would silently repoint the live domains from churchapp to the staging database. Gate A requires first splitting Vercel env vars per environment (Production → verified Production project) and confirming with the user which project is the real Production (churchapp vs. another).
- Also hardcoded churchapp references to fix in a later phase: `src/pages/member/MemberWelcome.tsx:55` (logo URL), `src/pages/settings/CommunicationsSettings.tsx:282` (Edge Function URL), `supabase/functions/test-payhero-stk/index.ts:30`.

### Unexplained-then-explained staging delta (20 Nov)
An ordinary self-signup at 04:55 UTC (not a canary address, no invite, no binding secret) created tenant `d35fd549…` ("…'s Church") + super_admin profile + auto member row via the unchanged new-church branch. Source: staging is only reachable from Vercel Previews. **Awaiting user confirmation of who created it; not deleted.** Totals after A canary: tenants 12, auth 13, profiles 12, members 16, staff_invitations 1.

### Test-procedure note
Vercel Deployment Protection drops the URL fragment that carries the Supabase session on invite/recovery links → open those emails in a browser already signed in to Vercel. Not a production-domain issue.

### Queued for Phase 5 (permissions)
- Settings → Users page and its Add actions are visible/usable in the UI for role `staff` (user-observed 20 Nov). Server denies (no INSERT policy on `public.users`; `send-invitation` requires admin), so no data effect observed — but UI must gate by role and show the denial clearly.
- No "resend invitation" path: an expired/consumed invite for an account that exists gets 409 from `send-invitation`; only password reset recovers it.
- `src/pages/settings/Users.tsx:~294` inserts `public.users` rows (arbitrary `role`, random id) directly from the browser; must be server-side / RLS-checked.

## §1B.2 Staff invitation handshake — evidence (19 Nov 2026)

| Gate | Result | How verified |
|---|---|---|
| Linked project | `xwbajophstetbnnemsyq` | `supabase/.temp/project-ref`; `config.toml` `project_id` still says `crjdsxxkspvdwknrmijs` (local label only — never trust it) |
| Baseline counts (pre-canary) | tenants 11, auth.users 11, public.users 10, members 14, staff_invitations 0, member_auth_memberships 1 | read-only `supabase db query --linked` |
| Trigger patch / marker grants | patch=true; marker EXECUTE anon=false, authenticated=false, service_role=true | same |
| `send-invitation` | ACTIVE **v3**, `verify_jwt=true` | `supabase functions list` |
| `STAFF_INVITATION_REDIRECT_ORIGIN` | present; SHA-256 digest equals digest of `https://vestry-lk16kvw6e-nguyovictors-projects.vercel.app` (value never printed) | `supabase secrets list` digest comparison |
| Auth redirect allowlist `/auth/invite` | USER-REPORTED DONE; not readable from CLI (token in keyring). Will be proven by the canary redirect | — |
| Preview `vestry-lk16kvw6e…` | READY, target=preview, SHA 7897c99; bundle references only `xwbajophstetbnnemsyq.supabase.co`; no `service_role` string; Vercel Authentication protection ON | `vercel inspect`, `vercel curl` |
| Stable branch alias | `https://vestry-hub-git-recovery-system-sta-87ec7a-nguyovictors-projects.vercel.app` (follows each push) | `vercel inspect` |
| Migration history | Local `20261118113822_…` renamed to remote version `20261119101722_p1b2_staff_invite_handshake.sql`, body set byte-identical to the remote-applied statement (md5 `f40a58e9ad5b03246e9365abf336e247`). Removed text was comments + BEGIN/COMMIT only; full reviewed text preserved in `docs/recovery/sql/PHASE1B2_STAFF_INVITATION_TRIGGER_REVIEW.sql` (identical to old local file, md5 `246202e3…`) | `migration list --linked` all paired; `db push --dry-run --linked` → "Remote database is up to date". No push, no `migration repair` |
| Rollback safeguard | `docs/recovery/rollback/20261119_pre_p1b2_handle_new_user.sql` — trigger code only, NOT data | copied from handover |
| Offline tests | handshake checker PASS; handshake node tests 10/10; callback Vitest 4/4 | local |
| Typecheck / build / secrets | secret guard PASS; `git diff --check` clean. **App typecheck UNVERIFIED locally**: 20 Nov runs with 4 GB heap hit the 25/30-min timeout (exit 124) on this 4-core/7 GB machine — not evidence. Moved to CI job `app-typecheck` (informational until baseline known) | local + CI |
| Church A staff canary | **STAGING_TEST_PASS** | 20 Nov 05:01 UTC invite via Preview admin UI (Users → Invite by email, role staff). Post-check (`staff-canary-verify.sh`, booleans only): 1 invitation, consumed, bound to Auth id = profile id, tenant A, role staff, active, invitation_sent; 0 profiles in Church B; 0 member links; invite contributed +1 auth / +1 profile / +1 auto member row (`auto_create_member` trigger) / **0 tenants**. Login: invite link token consumed but session lost behind Vercel Deployment Protection (fragment dropped) → "expired"; password set via Forgot password (`/auth/reset-password` allowlisted by user) → A-STAFF signed in 05:09 UTC, UI shows "Vestry Staging Church A". RLS impersonation (rolled-back txn, role authenticated, sub=A-STAFF): users other churches 0, members other churches 0, other tenants 0, staff_invitations no grant. Self-escalation blocked by `protect_user_security_fields`. |
| Negative: staff actor invites | **PASS (server)** | A-STAFF used Users → Invite by email for `canary-deny@example.test` → request rejected (non-2xx); DB: 0 auth users, 0 invitations, 0 profiles for that address. UI showed only the generic "Edge Function returned a non-2xx status code" (server message not surfaced) → queued Phase 5 UX. |
| Church B staff canary | **STAGING_TEST_PASS** | 20 Nov ~05:15 UTC invite by Church B admin via Preview UI. Post-check: 1 invitation consumed, bound Auth id = profile id, tenant B, role staff, active, invitation_sent; 0 profiles in Church A; 0 member links. Invite link opened in a Vercel-signed-in browser → /auth/invite → password set → B-STAFF signed in 05:20 UTC; UI shows "Vestry Staging Church B". Deltas +1 auth/+1 profile/+1 auto member/+1 invitation, **tenants unchanged (12)**. RLS impersonation as B-STAFF: own church users 2, other-church users/members/tenants 0; A-STAFF re-checked after B: other-church 0. |
| Aggregate (both canaries) | **PASS** | +2 Auth, +2 staff profiles, +2 consumed invitations, +2 auto member rows from canaries; tenants +0 from canaries (the +1 tenant is the separate 04:55 self-signup, see below). |

### 1B.2 DEFECT D-1 (2026-11-20): every real staff invite was rejected by the V1 trigger — ROOT_CAUSE_CONFIRMED, FIXED_LOCALLY
- **Found by:** independent review before the canary; confirmed against supabase/auth source (`internal/api/invite.go`, `mail.go`) and the live trigger (`on_auth_user_created` is AFTER INSERT).
- **Root cause:** GoTrue INSERTs `auth.users` with `invited_at = NULL` and sets it afterwards (`sendInvite` → `tx.UpdateOnly(u, "confirmation_token", "confirmation_sent_at", "invited_at")`). V1 raised `Pending staff invitation must be accepted through Auth invite` whenever a pending invite existed and `invited_at` was NULL → the Auth insert rolls back → `send-invitation` 503. Fail-closed (no stray tenant/identity), but no invitation could ever succeed. V1's offline contract and PG checks asserted the `invited_at` gate itself and inserted rows with `invited_at` pre-set, so they could not catch it.
- **Fix (V2):** migration `20261120043624_p1b2_staff_invite_insert_binding.sql` (guarded patch on V1; adds `staff_invitations.binding_nonce_hash`; marker → 2) + `send-invitation` (256-bit single-use secret in insert-time invite `data`, only SHA-256 stored server-side; requires marker 2). Tenant/role still come only from the server row. Bound secret with no pending row raises instead of falling through to new-church creation.
- **Evidence:** `scripts/recovery/p1b2-staff-binding-pglite-harness.mjs` 12/12 (real chain pre→V1→V2 on in-process Postgres; reproduces the V1 failure; V2 bind, self-signup, wrong/foreign secret, legacy row, expired row, duplicates, metadata tenant spoof, ordinary signup, guard re-run, grants); handshake node tests 11/11; checker PASS.
- **Rollback:** `docs/recovery/rollback/20261120_pre_v2_handle_new_user_v1.sql` (live V1 body, md5 of capture `991f9780…`) + redeploy send-invitation v3 — trigger code only.
- **Staging deploy (2026-11-20):** `db push --dry-run --linked` listed ONLY `20261120043624` (Phase 2 file held aside during the push, then restored) → `db push --linked` applied it. Post-check: V1+V2 markers present, old `invited_at` gate absent, marker returns 2, anon/authenticated EXECUTE false, `binding_nonce_hash` column present; counts unchanged (tenants 11, auth 11, profiles 10, staff_invitations 0). `send-invitation` deployed alone → **v4 ACTIVE, verify_jwt=true** (`--use-api`); OPTIONS 204, unauthenticated POST 401. Status: STAGING DEPLOYED, live canary pending.
- **Impact on Phase 2:** `20261119114430_p2_member_portal_provisioning.sql` replaces `handle_new_user` wholesale and was written against V1 → must be rebased on V2 and redesigned (see Phase 2 blockers) before it is applied.

### F-CI-1 (fixed locally): hidden typecheck failure
`src/components/admin/PerformanceMonitor.tsx:347` contained a raw `>` in JSX (TS1382). A syntax error makes `tsc` skip semantic checking, and CI runs `npx tsc --noEmit` against the root `tsconfig.json`, which has `files: []`, so CI type-checked nothing. Fixed with `{'>'}`. A full semantic run of `tsc -p tsconfig.app.json` has not yet completed on this 4-core / 7 GB machine (it ran out of memory once); result pending.

## §2 Finding 1 — member-only portal access (FIXED_LOCALLY)

Audit of the **deployed** staging functions against the report:

| Requirement (report Finding 1) | Deployed behavior before fix | Fix |
|---|---|---|
| No invitation/activation email | `member-provision-access` v3 (not in Git) called `auth.admin.inviteUserByEmail` | New source-controlled function uses `auth.admin.createUser({email_confirm:true, app_metadata:{member_provisioning_challenge_id}})`; no email sent |
| Status must not block | v3 provision + `member-login` v6 + `member-session-context` v5 rejected unless `status=active` and `membership_status in (active, member)` | Removed; access now requires the `member_auth_memberships` link |
| Provision at creation (admin, import, self-registration) | No frontend caller of provisioning; import/registration never provisioned | `Members.tsx`, `MemberImportModal.tsx`, `member-register` now provision; failure keeps member and tells admin to retry |
| Retry from Member Profile + status display | absent | `MemberPortalAccessCard` (status, email, "Retry Portal Access Setup", errors) |
| Existing identity associated, not duplicated; never overwrite | v3 returned `identity_already_exists` without associating; trigger did `ON CONFLICT (member_id) DO UPDATE` (overwrite) | Service-role RPC `member_portal_link_existing_identity`; trigger refuses overwrite |
| Trigger validates challenge, fails closed | Invalid/expired member challenge fell through to **new church + super_admin creation**; challenge read from user-editable metadata; never consumed | Trigger trusts only `raw_app_meta_data`, validates member/tenant/email/expiry/unconsumed, consumes it, raises on failure |
| Step 5: verify member + church code before OTP | Browser called `signInWithOtp` directly | New `member-otp-request` function (generic response, no enumeration) calls `signInWithOtp({shouldCreateUser:false})` only for provisioned members |
| Statuses `already_provisioned / provisioned / provisioned_existing_identity` | `invitation_sent / identity_already_exists` | Implemented exactly |
| Import path | `registration_source='import'` violates `members_registration_source_check` → every import row failed while UI toasted success | Constraint extended with `import`; modal reports failures honestly |

Files: `supabase/migrations/20261119114430_p2_member_portal_provisioning.sql`, `supabase/functions/_shared/member-portal-provisioning.ts`, `supabase/functions/{member-provision-access,member-otp-request}/index.ts` (new in Git), `supabase/functions/{member-login,member-session-context,member-register}/index.ts`, `src/lib/{memberPortalProvisioning,memberOtpLogin}.ts`, `src/components/members/{MemberPortalAccessCard,MemberImportModal}.tsx`, `src/pages/people/{Members,MemberProfile}.tsx`, `src/pages/member/MemberLogin.tsx`, tests below. `member-register` source rebased on deployed v7 (repo copy was stale).

Automated evidence: provisioning node tests 9/9; member-auth contract checker PASS (new Finding 1 assertions); member-auth node tests 12/12; `src/test/p1/people` Vitest 57/57; ESLint: new files clean, and the edited pages have the same pre-existing error counts as before (Members 7, MemberProfile 30, MemberImportModal 5); disposable Postgres harness (`scripts/recovery/p2-member-provisioning-pg-harness.sh`, real migration on PG17, no network) **29/29 PASS**.

Known follow-ups: existing members on staging/Production have no `member_auth_memberships` row (staging: 1 of 14). After deploy they need provisioning (admin Retry per member, or a reviewed one-off backfill) before they can sign in — required before Gate B. Supabase Magic Link email template must contain `{{ .Token }}` (see PHASE1B1 doc). Built-in SMTP rate limits may throttle canary emails.

## Security observations queued for later phases
- `public.tenants` stores provider credentials (`daraja_consumer_secret`, `at_api_key`, `whatsapp_access_token`, …) in ordinary columns → Phase 5 RLS/column-privilege review.

## Human-only actions outstanding
1. ~~Church A / Church B staff canaries~~ DONE 20 Nov. Canary emails live in git-ignored `.env.canary.local` (NOT `.env.qa.local`).
2. Confirm origin of the 04:55 UTC self-signup tenant.
3. Member canaries A-MEMBER / B-MEMBER after Phase 2 staging deploy.
