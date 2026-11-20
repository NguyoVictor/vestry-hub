# Vestry Hub — Live recovery status / checkpoint

**Branch:** `recovery/system-stabilization-2026-11` (no other branches; no merge to `main` until Gate A)
**Staging (only approved write target):** Supabase `xwbajophstetbnnemsyq` (vestry-hub-staging). `churchapp` `crjdsxxkspvdwknrmijs` and real Production are OFF LIMITS.
**Status vocabulary:** UNVERIFIED / REPRODUCED / ROOT_CAUSE_CONFIRMED / FIXED_LOCALLY / AUTOMATED_TEST_PASS / STAGING_TEST_PASS / ACCEPTED / BLOCKED.
**Last updated:** 2026-11-20 (Phase 1B.2 and Phase 2 closed on staging)

## Phase dashboard

| Phase | Scope | Status | Evidence | Commit | Open items |
|---|---|---|---|---|---|
| 0 | Environment safety / baseline | PARTIAL | Linked CLI ref = staging (verified 19 Nov); full staging dump waived by user | earlier | Disposable QA project; Production backup (Gate B) |
| 1 | Credible CI | PARTIAL | `tsc --noEmit` in CI uses root tsconfig with `files: []` → checks nothing (see F-CI-1) | — | Point CI at `tsc -p tsconfig.app.json` once clean |
| 1B.2 | Staff invitation handshake | **STAGING_TEST_PASS** — V2 fix (D-1) deployed 20 Nov; Church A + B canaries and isolation passed | see §1B.2 | pending | Church A then B staff canary (human inbox + admin session) |
| 2 (1B.3) | Finding 1 member-only provisioning + OTP | **ACCEPTED 20 Nov** (user sign-off after staff A/B + member A/B canaries) | see §2 | `5d250a1`, `401b055`, `754da4e`, `baca8a4` | carried-forward items in PRODUCTION_READINESS.md |
| 3 | Findings 2–6 (People/Operations schema drift) | **Findings 2–4 STAGING_TEST_PASS** (browser canary 20 Nov); 5–6 BLOCKED (Operations module disabled for QA churches) | see §3 | `4689c0e` | enable Operations for Church A → canary 5/6; user sign-off |
| 4–10 | Findings 7–27 + product items | PENDING | — | — | — |
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

### CI evidence — `e36e652` (Phase 1B.2 commit, pushed by user 20 Nov)
- P1B1 Member Auth Safety: success — https://github.com/NguyoVictor/vestry-hub/actions/runs/44680914177
- Phase 0 Source Safety: success — https://github.com/NguyoVictor/vestry-hub/actions/runs/44680914521
- P1 P2 Quality — https://github.com/NguyoVictor/vestry-hub/actions/runs/44680914340 : `source-quality` success, `staff-invite-handshake` success (incl. PGlite harness), `secret-scan` success, `platform-e2e` skipped (by design), **`app-typecheck` failure (informational job, first real run)**.
- **F-CI-1 baseline:** ≥10 type errors (GitHub shows only the first 10 annotations; full log needs auth). All visible ones are in `src/components/announcements/*` (`never` parameter types, unknown `status` column, excessive type depth) → likely generated `src/integrations/supabase/types.ts` drift vs. schema. Phase 1 task: regenerate types from staging, fix, make job blocking.
- Vercel Preview for `e36e652`: `https://vestry-nfo6ofuui-nguyovictors-projects.vercel.app` READY, target preview.

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

### §2 update — 20 Nov 2026 (review blockers fixed, rebased, deployed to staging)
Independent review found two blockers in the 19 Nov local draft, both fixed:
- **B-1 (ROOT_CAUSE_CONFIRMED via supabase/auth `admin.go`):** `createUser` applies `app_metadata` and `email_confirm` only AFTER the `auth.users` INSERT, so the trigger never saw `member_provisioning_challenge_id`; every provisioned member would have fallen through to **new church + super_admin**. Fix: challenge id + 256-bit single-use secret in insert-time `user_metadata` (passed to `models.NewUser`), SHA-256 stored in new `member_login_challenges.binding_secret_hash`. The harness reproduces the old failure (test 2).
- **B-2:** `member-register` visitor insert wrote non-existent `visitors.registration_source` (live schema has only `service_attended`) → every visitor registration would 500. Restored `service_attended`; kept the correct `members.address` fix. CRLF line endings restored (whole-file churn removed).
- Draft migration `20261119114430` (whole-function replace, never applied) **superseded** by guarded patch `20261120052702_p2_member_portal_provisioning.sql` on the live V2 trigger. It replaces the legacy `member_login_challenge_id` branch (trusted user-editable metadata alone and OVERWROTE links; no remaining caller), adds a unique `(auth_user_id, tenant_id)` index (one member per identity per church), and keeps staff V2 and ordinary signup unchanged. The old Docker harness for the draft was retired.
- Also: `supabase/config.toml` declares `member-provision-access` verify_jwt=true and `member-otp-request` verify_jwt=false (public; `sb_publishable_` key is not a JWT); `member-otp-request` pads every generic reply to ≥2.5 s (no timing oracle).
- **Evidence:** `scripts/recovery/p2-member-provisioning-pglite-harness.mjs` 11/11 (pre→V1→V2→P2 chain); provisioning unit tests updated to the real GoTrue order; member-auth contract PASS; node recovery tests 38/38; people Vitest 57/57; P2 contracts 52/52.
- **Staging deploy:** dry run listed only `20261120052702` → applied. Post-check: V2 + MEMBER_PORTAL_PROVISIONING_V1 markers, legacy branch gone, helpers not executable by `authenticated`, counts unchanged (tenants 12, auth 14, profiles 13, members 17, links 1). Functions deployed individually (`--use-api`): `member-provision-access` v4 (jwt on), `member-otp-request` v1 (jwt off), `member-login` v7 (jwt on), `member-session-context` v6 (jwt off), `member-register` v8 (jwt off). Non-writing smoke: otp OPTIONS 200, bad body 400, unknown church generic 200 in 2.8 s, provision anonymous 401, register missing fields 400.
- **Rollback (trigger code only):** `docs/recovery/rollback/20261120_pre_p2_handle_new_user_v2.sql`.
- **Known limitations:** provisioning authorizes only super_admin/church_admin/admin, while member INSERT is governed by `can_write_permission('member_management')` → other permitted roles see "setup failed, admin can retry" (Phase 5). Public `member-register` has no rate limit/captcha (Phase 6). Editing a member's email after provisioning leaves the link on the old identity (follow-up). Existing pre-Phase-2 members (staging 16 of 17) have no portal link until an admin uses Retry or a reviewed backfill runs (required before Gate B).

### §2 member canary A — in progress (20 Nov)
- First attempt ran on an **older Preview** (no Phase 2 frontend): member "koko kiki" saved in Church A 06:05 UTC with 0 challenges / 0 identities / 0 links → only "added successfully" toast; old login called `signInWithOtp` directly → "Unable to send". Confirmed read-only; nothing extra created.
- On Preview `vestry-anbv9h4l4…` (5d250a1, bundle → staging only): Member Profile showed portal access not set up + **Retry Portal Access Setup** → clicked → toast "Member Portal access is ready". DB: 1 Auth identity (06:23 UTC, confirmed, no email sent), 1 link to that member in **Church A**, challenge consumed, **0 staff profiles, tenants 12**. A pre-existing 25 Oct member with the same email in a third church stayed unlinked. **Retry path + no-invitation provisioning: STAGING_TEST_PASS.**
- OTP email delivered with an **8-digit** code; login failed "verification code could not be confirmed" (`last_sign_in_at` NULL → Supabase rejected). **Defect D-2 ROOT_CAUSE_CONFIRMED:** `MemberLogin.tsx` truncated input to 6 digits (`maxLength={6}`, `.slice(0,6)`) and `verifyMemberOtpAndLogin` required `^\d{6}$`; staging Auth sends 8. **Fix:** shared `isValidMemberOtp` (6–10 digits, Supabase's configurable range), `MEMBER_OTP_MAX_LENGTH=10`; regression test sends an 8-digit code untruncated to `verifyOtp`. Vitest people 59/59.

- **Built-in Auth email rate limit hit twice** (06:32→07:12 and after 07:12): `member-otp-request` correctly hides Auth errors behind its generic reply, so the UI said "sent" with no email. Confirmed via `auth.users.recovery_sent_at`; a direct `/auth/v1/otp` (create_user:false) call at 07:12 returned 200 and delivered. **Action (before Gate B, recommended for staging): custom SMTP.**
- 07:12:56 the 8-digit code verified (`last_sign_in_at`), but `member-login` returned **403**. All three lookups replay correctly in SQL (tenant 1, link 1, email match 1); that code had been sent by the direct call, which skips the church-code pre-check, so the most likely cause is a church code that did not match on the page (a correct denial). `member-login` **v8** now logs a reason category on every denial (no PII).
- **Member A sign-in: STAGING_TEST_PASS** (Preview `vestry-4mwt5r42f…` = `401b055`). Via the page: email + `51070F0A` → OTP email (8 digits) → verified → Member Portal shows "Vestry Staging Church A". DB: 1 active session in Church A, 0 in other churches, token stored as `sha256:` hash, link `last_used_at` set, 0 staff profiles, tenants 12.

- **Negative — wrong church code: PASS.** A-MEMBER email + Church B code `7805EE99` → generic "If your account is eligible…" reply, **no email sent** (server refuses before calling Auth; no quota used).
- **Negative — Admin Portal: FAIL → D-3 FIXED_LOCALLY.** While signed in as A-MEMBER, `/dashboard` offered **church creation** (onboarding). Root cause: the member OTP leaves a Supabase Auth session in the browser; `AuthGuard` treated "Auth session without staff profile" as a new admin needing onboarding. Data impact: none — `authenticated` has **no INSERT privilege on `public.tenants`** (+ RLS on, no INSERT policy on `public.users`), so the onboarding writes are refused. Signing the Auth session out after member login was rejected as a fix because member RLS helpers `member_has_tenant` / `member_has_member` / `member_actor_matches` use `auth.uid()`. Fix: `src/lib/memberOnlyIdentity.ts` (`isMemberOnlyIdentity`, own-row read of `member_auth_memberships`, fails closed) used by `AuthGuard` (new `member-only` state → `/member`) and `Onboarding.tsx` (load and submit). Test `src/test/p1/people/memberOnlyAdminDenial.behavior.test.tsx` 3/3.
- `member-login` v8 deployed (denial reason logging only).

- **D-3 verified on staging (Preview `vestry-ob2ad72wc…` = `754da4e`):** signed in as A-MEMBER, `/dashboard`, `/onboarding` and `/settings` all redirect to `/member`; no onboarding or admin UI. DB proof under real RLS as the A-MEMBER identity (rolled-back txn): `insert into tenants` → 42501 permission denied; `insert into users` (self → super_admin of Church A) → 42501 permission denied; tenants still 12.
- **MEMBER A: STAGING_TEST_PASS** — provisioning without invitation (Retry path), OTP via page with church-code pre-check, portal session in Church A only, wrong-church-code denial, Admin Portal denial.

- **MEMBER B: STAGING_TEST_PASS** (Preview `vestry-ob2ad72wc…`): Church B admin added member → dialog "Member Portal access is ready — no activation is needed", no email; OTP login with `7805EE99` → portal "Vestry Staging Church B"; `/dashboard` → `/member`; B-MEMBER + Church A code → generic reply, no email. DB: B identity linked only in Church B, session only in Church B, 0 staff profiles, 0 open challenges; A re-checked: link/sessions only in Church A. Totals: tenants 12, auth 16, profiles 13, members 19, links 3, staff_invitations 2.

### Finding 1 acceptance matrix (report §11) — 20 Nov 2026
| Criterion | Result | Evidence |
|---|---|---|
| New member with email can request OTP without an invitation | PASS | A (Retry path) and B (create path): no email at provisioning |
| OTP delivered to member email | PASS | 8-digit code (after D-2 fix); built-in SMTP rate limit noted |
| Member verifies OTP and enters portal | PASS | A → Church A, B → Church B |
| Member cannot access another church's records | PASS (session/link level) | links & sessions only in own church; wrong church code refused. Deeper member-data RLS matrix → Phase 5 |
| Member cannot access Admin Portal because Auth identity exists | PASS | D-3 fixed: admin routes → `/member`; DB refuses tenant/users inserts (42501) |
| Not blocked by Pending Approval / inactive status | PASS (code + unit) | status gates removed in member-login/session-context; canary members used default statuses |
| Failed provisioning does not delete member | PASS | koko kiki saved with no identity, then Retry provisioned |
| Retry without duplicates | PASS | 1 identity, 1 link each; harness + unit idempotency tests |
| Existing admin auth/authorization still works | PASS | Church A/B admins invited staff; staff canaries passed |
| Edge/migration/frontend tested on staging before production | PASS | migrations `20261120043624`, `20261120052702`; functions send-invitation v4, member-provision-access v4, member-otp-request v1, member-login v8, member-session-context v6, member-register v8 |

**Phase 2 status: ACCEPTED by the user on 20 Nov 2026.** Untested paths carried forward: CSV import provisioning and QR self-registration provisioning (code + unit tested, not browser-canaried), member-data RLS matrix (Phase 5), custom SMTP (before Gate B), backfill of portal links for pre-existing members (before Gate B).

## §3 Findings 2–6 — People / Operations schema drift (20 Nov 2026)

| Finding | Root cause (verified read-only against live staging schema) | Fix |
|---|---|---|
| 2 House Fellowships | code selected non-existent `fellowship_members.role` → member list always empty, duplicate adds failed | removed `role` from selects/writes in `FellowshipDetail`, `HouseFellowships`, member portal `MemberHouseFellowship` |
| 3 Families | code wrote `name`; column is `family_name` → every create 400 | `Families`, `FamilyDetailPage` use `family_name`; child-row failures surfaced (no false success) |
| 4 Visitors | `readOnly` referenced in components where it is not in scope → crash (5 actions) | permission read in each component; same crash class fixed in `Staff` (payroll), `CMCheckin`, `QRCodes` |
| 5 Member Requests | code (and live trigger `private.protect_member_request_fields`) reference non-existent `member_requests.resolved_by` → every status change 400 / 42703 | migration adds `resolved_by` (FK `public.users`, ON DELETE SET NULL); errors surfaced in UI |
| 6 Board Meetings | code saves `end_time,type,location_type,online_link,pre_meeting_notes,status` — absent on staging → every save 400 | migration adds the 6 columns with defaults + CHECK constraints mirroring UI constants; attendee-write failures no longer report "Meeting scheduled"; empty strings → NULL |

- **Migration:** `20261120083842_p3_member_requests_board_meetings_columns.sql` — additive, idempotent, no data modified (staging had 0 `board_meetings` rows). Dry run listed only this file → applied to staging 20 Nov; post-check: 6 columns + `resolved_by` + 4 constraints present, tenants unchanged (12). Remote history paired (re-verified 20 Nov 12:1x). Rollback: drop added columns/constraints.
- **Types:** `src/integrations/supabase/types.ts` regenerated from staging (124 → 219 tables).
- **Hard-coded projects (A3/A4):** `MemberWelcome` logo → bundled asset, `CommunicationsSettings` and `test-payhero-stk` derive from env `SUPABASE_URL`; `config.toml` label = staging; new CI guard `scripts/qa/check-no-hardcoded-supabase-projects.mjs`.
- **CI F-CI-1 / F1:** `app-typecheck` is now **blocking** via per-file ratchet (`scripts/qa/typecheck-ratchet.mjs`, baseline `typecheck-baseline.json` from the full post-regeneration run): existing errors tolerated, any new error fails.
- **Automated evidence (20 Nov):** P1 Vitest 27 files / 148 tests PASS (incl. new `phase3SchemaContract.test.ts`, which checks every written column against the regenerated types); ratchet unit tests 3/3; hard-coded project guard PASS; client source guard PASS; `git diff --check` warnings are pre-existing CRLF files only (line endings preserved).
- **Pushed:** `4689c0e` (first push by Claude via repo-scoped deploy key; remote SHA verified with `git ls-remote`). CI all green: source-quality, staff-invite-handshake, **app-typecheck (now blocking) success**, offline-safety, secret-scan, member-auth-source-contract; platform-e2e skipped by design. Vercel Preview `https://vestry-3mhnpfr7p-nguyovictors-projects.vercel.app` (deployment `dpl_HNuM1fgDrvzYjp7cxs8kCyUSP5zX`, status for `4689c0e` = success), target preview.
- **Browser canary (20 Nov, Playwright `playwright.staging-canary.config.ts` + `e2e/qa/staging-canary-phase3.spec.ts`, Vercel bypass token, QA admin logins from git-ignored `.env.e2e.local`):**

| Check | Result |
|---|---|
| F3 Church A admin creates family `QA-CANARY-202611200926 Family` + 1 member → "Family created", visible after reload, 0 failed Supabase calls, 0 page errors | **PASS** — DB: 1 family in Church A with 1 `family_members` row |
| F4 Church A admin adds visitor (sheet that crashed on `readOnly`) → "Visitor added", visible after reload, 0 failures/errors | **PASS** — DB: 1 canary visitor, Church A |
| F2 Church A admin adds member to a fellowship → "Member added", listed after reload; then Remove → "Member removed", gone after reload | **PASS** — DB: 0 recent fellowship memberships left (cleanup verified) |
| Isolation: Church B admin cannot see Church A canary family or visitor | **PASS** |
| Invariants | tenants 12 (unchanged); canary rows only in Church A |
| F5 Member Requests / F6 Board Meetings | **BLOCKED** — `/member-requests` and `/board-meetings` redirect to dashboard: `tenants.enabled_modules.admin.operations=false` for both QA churches (setup choice, not a code defect). Needs Operations enabled for Church A (Settings) before the canary. |

- **Observed, queued for Phase 5:** on every admin page load `POST /rest/v1/login_events` → 403 and `PATCH /rest/v1/users` (AuthGuard `last_login_at`) → 403 repeatedly. Silent, no UI effect; RLS denies the writes.
- Canary records left in place deliberately as evidence (1 family, 1 visitor, tagged `QA-CANARY-`).

## Security observations queued for later phases
- `public.tenants` stores provider credentials (`daraja_consumer_secret`, `at_api_key`, `whatsapp_access_token`, …) in ordinary columns → Phase 5 RLS/column-privilege review.

## Human-only actions outstanding
1. ~~Church A / Church B staff canaries~~ DONE 20 Nov. Canary emails live in git-ignored `.env.canary.local` (NOT `.env.qa.local`).
2. Confirm origin of the 04:55 UTC self-signup tenant.
3. Member canaries A-MEMBER / B-MEMBER after Phase 2 staging deploy.
