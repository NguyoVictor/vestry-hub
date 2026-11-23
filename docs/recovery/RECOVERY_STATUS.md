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
| 3 | Findings 2–6 (People/Operations schema drift) + F8 | **ACCEPTED 20 Nov (Findings 2–6, user sign-off)**; F8 fix STAGING DEPLOYED | see §3 | `4689c0e`, `1044be2`, `3418cd3` + F8 commit | F8 UI hint browser check only possible on a church with zero types |
| 4 | Findings 7, 9, 25 (+ Storage inventory, ambiguous embeds) | **ACCEPTED 20 Nov (user sign-off)** — browser canary + DB + Storage API negatives | see §4 | `89d67c0`, `036e155`, `b594ce8` (CI green) | Finding 13 uploads deferred (media out of launch scope) |
| 5 | Findings 14, 19, 26 + tenant RLS + access hardening | **CLOSED 20 Nov** — F14, F19, F26, hardening, E1, E4, E11 ACCEPTED by user; final loopholes (E5 secrets, quiz scores, volunteer hours) STAGING_TEST_PASS | see §5 | `0ad0b1b` … `5bfc7a6`, `958ffc8` + close-out | user: enable "Prevent use of leaked passwords" (staging + Production) |
| 6 | Finding 8 + Edge Function inventory/hardening + launch-scope gating | **ACCEPTED 20 Nov** (F8 + Phase 6); Findings 10, 11, 20-AI **DEFERRED** — see `DEFERRED_BACKLOG.md` | see §6 | `a1cd4bd`, `e05a3f5`, `c2a415f`, `6d3de63`, `8d611e0` | — |
| 7 | Church Studio removal (product) | **ACCEPTED 20 Nov** — UI removed, shared `studio_media` kept; Findings 12, 13, 15, 16 DEFERRED | see §7–8 | `04cb1f0` | — |
| 8 | Findings 17, 18, 20 (non-AI) | **ACCEPTED 20 Nov** | see §7–8 | `a2afe03`, `83fd0e9` | — |
| 9 | Findings 21–24 (ledger, payouts, payables, expenses) | **ACCEPTED 20 Nov**; IntaSend payment flows pending sandbox keys | see §9 | `d141940` | IntaSend sandbox keys |
| 10 | Finding 27 tax rates, payroll edit/deactivate/delete, budget utilisation, Branding removed | **STAGING_TEST_PASS** — browser + DB + PGlite + cross-church | see §10 | `cdd4a74` | user sign-off |
| 11 | Full staging acceptance | **AUTOMATED ACCEPTANCE PASS** (41/41 browser, 161 unit, 37 harness, 0 leaks × 183 tables, typecheck −12) — user UAT checklist pending | `PHASE11_ACCEPTANCE.md` | see below | user UAT + IntaSend keys |
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
| Setup (user-approved 20 Nov) | Church A admin enabled **Operations** via Settings → Modules ("Module settings saved") and added default request types via Settings → Service Requests → "Add Default Types" (Church A had 0). Church B untouched (Operations off, 0 types). |
| F5 Church A admin creates request `QA-CANARY-202611200926 Request` → kanban **Start** → reload shows In Progress → **Resolve** → reload shows Resolved; 0 failed Supabase calls, 0 page errors (`e2e/qa/staging-canary-phase3-ops.spec.ts`) | **PASS** — DB: status `completed`, `resolved_by` set to a Church A admin |
| F6 Church A admin schedules online meeting with link + pre-meeting notes → "Meeting scheduled", visible after reload, 0 failures/errors | **PASS** — DB: `location_type=online`, link, notes, `end_time`, `type=board_meeting`, `status=scheduled`, Church A |
| Isolation: Church B admin still redirected away from `/member-requests` and `/board-meetings` | **PASS** |
| Invariants after all canaries | tenants 12; canary rows only in Church A (1 family, 1 visitor, 1 request, 1 meeting) |

- **Observed, queued for Phase 5:** on every admin page load `POST /rest/v1/login_events` → 403 and `PATCH /rest/v1/users` (AuthGuard `last_login_at`) → 403 repeatedly. Silent, no UI effect; RLS denies the writes.
- Canary records left in place deliberately as evidence (1 family, 1 visitor, 1 request, 1 board meeting, tagged `QA-CANARY-`).
- **Product gap found (queued):** new churches start with **no service request types** (staging: only 2 of 12 tenants have any), so Create Request (admin) and member-portal requests cannot be submitted until an admin finds Settings → Service Requests → "Add Default Types"; the empty dropdown gives no hint. Proposal: seed defaults at church creation + backfill, or show an inline link.

**Phase 3 status: Findings 2–6 ACCEPTED by the user on 20 Nov 2026.**

### F8 — default service request types (user: "fix F8 now", 20 Nov)
- **Root cause:** `service_request_types` is per-tenant and nothing seeded it at church creation; only an admin-only Settings button did. Staging: 10 of 12 real churches had zero types → admin "Create Request" and member-portal requests impossible, with a silent empty dropdown.
- **Fix:** migration `20261120100000_p3_seed_default_service_request_types.sql` — `private.seed_default_service_request_types(text)` (15 defaults identical to the UI list, `ON CONFLICT DO NOTHING`), `AFTER INSERT` trigger `tenants_seed_service_request_types` (failure caught as WARNING so signup/church creation can never be blocked), one-off backfill for tenants with **zero** types only; EXECUTE revoked from anon/authenticated. UI: admin form shows "No request types are set up yet — Add request types in Settings" link; member portal shows "Your church has not set up request types yet. Please contact your church office."; both now surface load errors instead of an empty list.
- **Automated:** `scripts/recovery/p3-service-request-types-pglite-harness.mjs` 6/6 (backfill only empty tenants; curated list untouched; new tenant seeded; idempotent re-run keeps edits; seeding failure does not block tenant insert and the existing church-code trigger still runs; no anon/authenticated EXECUTE; SQL list == UI DEFAULTS). Added to blocking CI job `staff-invite-handshake`. P1 Vitest 148/148; ESLint error counts unchanged vs HEAD (pre-existing); guards PASS.
- **Staging deploy (20 Nov 09:42 UTC):** dry run listed only `20261120100000` → applied. Post-check: 12 tenants; 0 with zero types; 11 with exactly 15 (10 backfilled + Church A via Settings earlier); the one church with its own pre-existing list (1 type, created 16 Nov) received **0** new rows; trigger enabled alongside `auto_generate_church_code`; anon/authenticated EXECUTE false.
- **Found:** 7 `service_request_types` rows belong to a tenant id that no longer exists (from 20260419 seed migration; table has no FK to `tenants`). Harmless; queued as cleanup (readiness B7).
- **Not browser-tested:** the empty-list hints (no staging church has zero types any more; creating a church = a signup, deliberately not done). Covered by code review + the trigger making the state unreachable for new churches.
- **Rollback (code only):** drop trigger + the two functions (see migration header); backfilled rows are ordinary editable types.

## §4 Findings 7, 9, 25 — Storage, facilities, incidents, General Settings (20 Nov 2026)

**Reproduced first** on Preview `vestry-hj34fwldv` (SHA `4f7d6bd`) as Church A admin with real error codes captured (`e2e/qa/staging-canary-phase4-repro.spec.ts`):

| Finding | Real error (was "not captured" in the report) | Root cause |
|---|---|---|
| 25 General Settings | `PATCH /tenants` → 400 `PGRST204 Could not find the 'timezone' column`; logo upload 400 | `tenants.timezone` missing; bucket `church-logos` missing (its tenant-folder policies existed); a failed logo upload was **ignored** and "Settings saved" shown |
| 9 Incidents | `POST /incidents` → 400 `PGRST204 'attachment_paths'` **even with no attachment**; attachment upload 400 | `incidents` lacked 7 written columns; `incident_status_logs` table absent; enum lacked `closed`; bucket `incident-attachments` missing |
| 7-A Facility thumbnail | upload 400 | bucket `facility-thumbnails` missing |
| 7-B Facility not listed | list `GET /facilities` → **HTTP 300**; UI: "Total Facilities 1" + "No facilities found" | ambiguous PostgREST embed: `facility_images` has simple + composite tenant FK to `facilities` (containment migration); error rendered as empty list |

**Fix:** migration `20261120120000_p4_storage_incidents_settings.sql` (dry run listed only it → applied to staging): `tenants.timezone`; incidents columns + severity check + enum `closed`; `incident_status_logs` (staff-only RLS via `get_my_tenant_id()`, append-only, no anon); buckets `facility-thumbnails` (public, 5 MB, webp/jpeg/png; writes only `can_manage_facility_bookings(folder)`), `incident-attachments` (**private**, 10 MB; read/write only tenant staff), `church-logos` (public, 5 MB; writes **tightened** from `actor_has_tenant` — which admits portal members — to tenant staff / platform super admin). Frontend: real per-step error messages (no false success), facility load error state, incident attachments opened via 60 s signed URL, filename sanitising; **FK hints for 15 ambiguous embeds** (facilities ×3, announcements ×2, testimonies ×2, member groups, member profile groups, member home volunteer roles, group join requests). Canary also found and fixed: incident **Update Status could never change status** (render-time reset) and **Edit opened a blank form** (useState-as-effect) — `036e155`. Types regenerated (+104 lines).

**Automated:** `src/test/p1/operations/phase4SchemaContract.test.ts` 7/7 (written columns vs generated types, bucket visibility + tenant-folder policies, pinned embeds, no false success); P1 Vitest 28 files / 155 tests; ESLint error counts unchanged vs HEAD on all 13 edited files.

**Browser canary** (`e2e/qa/staging-canary-phase4.spec.ts`; F7 on Preview `vestry-2o3fgg6jo` = `89d67c0`, F9/F25/isolation/embeds on `vestry-qv1ca2vmg` = `036e155`; facility code identical between the two):

| Check | Result | DB / Storage evidence |
|---|---|---|
| F7 facility **with thumbnail** → "Facility created.", listed after reload, thumbnail image rendered | **PASS** | facility in Church A, `thumbnail_path` under A's folder; 1 object in `facility-thumbnails/A/` |
| F9 incident **with attachment** → "Incident reported successfully", listed after reload | **PASS** | incident in A, `incident_number`, 1 attachment under A's folder |
| F9 attachment opens via signed URL (200 image/png); bare public URL refused (400) | **PASS** | bucket private |
| F9 Update Status → Investigating persists after reload; Edit opens pre-filled | **PASS** | status `investigating`; 1 `incident_status_logs` row |
| F25 timezone Africa/Kampala + new logo → "Settings saved successfully"; both persist after reload | **PASS** | `tenants.timezone`, `logo` → `church-logos/A/logo-…` |
| Isolation (Church B admin, direct Storage API): write into A's `facility-thumbnails`, `incident-attachments`, `church-logos` folders | **PASS** — 400 / 400 / 400 (RLS) | 0 objects written in A by B |
| Isolation: B lists A's incident attachments | **PASS** — 0 visible | |
| Positive control: B writes into its OWN incident folder | 200 | 1 four-byte test object in `incident-attachments/B/` (canary residue) |
| Embeds: each pinned select 200; same select un-pinned 300 | **PASS** for facilities, announcements, testimonies, group_members, volunteers, join_requests | proves the 15 queries were failing silently on staging |
| Invariants | tenants 12 | |

**Queued (not Phase 4):**
- `PATCH tenant_subscriptions` (storage-usage counter) from the browser → 403 (correctly denied). Usage accounting must move server-side → billing phase (readiness E8).
- `facilities_public_read_safe` lets anyone read every church's active facilities → Phase 5 review (may be intended for public booking pages).
- `asset-images` / `facility-images` upload/delete policies allow any authenticated user on any path → Phase 5.
- Incident page read-only gate keyed to `reports_analytics` permission → Phase 5.
- Buckets still missing but out of launch scope (media deferred): `church-media` (Finding 13), `sermon-recordings`, `quiz-documents`.

## §5 Findings 14, 19, 26 — Permissions / RLS (20 Nov 2026)

**Root cause (verified read-only on staging):** 44 public tables had ROW LEVEL SECURITY **enabled with zero policies** → every browser read/write denied for everyone, admins included. Includes `asset_release_requests` (F14 "You do not have permission…" = `toUserFacingError` wording for an RLS denial), `store_categories` (F19), `giving_categories` (F26 "new row violates row-level security policy"). Their original migrations created (overly broad) tenant policies; those were removed **outside migration history** (no migration drops them) — Production must be inspected separately (readiness B8).

**Fix:** migration `20261120140000_p5_restore_tenant_rls_policies.sql` — 100 policies on 26 browser-used tables (read: tenant staff, or staff+portal members where members need it; write: `private.can_write_permission(<church>, <same key as the page's isReadOnly gate>)`; permission tables: `can_manage_permissions` = church admins only; `activity_log` / `legal_signatures` insert-only). Every WITH CHECK is on the row's own church column (no cross-church writes). 18 tables intentionally left locked (server-only/unused or platform-wide): `automation_settings`, canva_*, `device_tokens`, `integration_settings`, `member_login_challenges`, `member_sessions`, `order_items`, payroll_run(s/_lines), resource_assignments/collections, `collection_resources`, `sermon_views` (media deferred), `staff_invitations`, `tenant_payment_credentials`, `users_backup`, `webhook_events`. Dry run listed only this file → applied; post-check 100 `_p5_` policies, 18 locked as intended; all helpers executable by `authenticated`.

**Evidence** (`e2e/qa/staging-canary-phase5.spec.ts`, Preview `vestry-qv1ca2vmg` = `036e155`; policies are server-side so the frontend SHA is not material):

| Check | Result |
|---|---|
| F26 browser: Church A admin Settings → Giving → Add Category → "Category created successfully", visible after reload, 0 failed calls | **PASS** |
| F19 API (A admin session): create store category 201, reads it back | **PASS** |
| F14 API (A admin): create asset 201 → release request 201 → approve 200 (1 row) | **PASS** |
| A staff (role staff, default level) reads A's release request / giving categories | **PASS** (1 / 1) |
| B admin reads A's store categories / release requests / giving categories | **PASS** 0 / 0 / 0 |
| B admin writes into A: store category, giving category | **PASS** 403 / 403 |
| B admin updates A's release request | **PASS** 0 rows affected |
| Permission admin: A staff → feature_permissions 403; B admin into A 403 | **PASS** |
| Setup (user-approved 20 Nov) | Church A admin enabled **Resources & Media** via Settings → Modules; Church B untouched (off) |
| F19 browser: Resource Store → Categories → Add Category → "Category created", visible after reload, 0 failed `store_*` calls (`e2e/qa/staging-canary-phase5-media.spec.ts`) | **PASS** — DB: category in Church A |
| F14 browser: Asset Management → Release Requests → New Request → "Release request submitted" → Approve → "Request updated"; shows approved after reload, 0 failed `asset_*` calls | **PASS** — DB: request `approved`, Church A |
| Church B still redirected away from /asset-management and /resources-store | **PASS** |
| User sign-off | F26 ACCEPTED 20 Nov |

**Found while investigating (queued):** `CommunicationsSettings.tsx` upserts a `service_role_key` row into the platform-wide `automation_settings` table from the browser (now correctly denied) — remove the call. `AssetManagement` deletes an asset's release requests/maintenance without checking errors before deleting the asset.


### §5 hardening (20 Nov 2026, after F14/F19/F26 acceptance)

| Item | Root cause | Fix | Evidence (`e2e/qa/staging-canary-phase5-hardening.spec.ts`, `…-phase5-rpc.spec.ts`, Preview `vestry-6g8dc2dpj` = `a72d505`) |
|---|---|---|---|
| **CRITICAL (latent): analytics RPCs** | 5 SECURITY DEFINER `get_*_optimized(p_tenant_id)` + 3 maintenance fns executable by **anon** with no caller check → any visitor could request any church's dashboard/member/financial analytics. Today every call crashes inside (42883 `varchar = uuid`), so **no data was returned** — the exposure was one bug-fix away | migration `20261120160000`: originals moved to `private.<name>_impl` (owner-only, search_path pinned); same-name public wrappers call `private.assert_own_church()`; maintenance/song fns not executable by anon/authenticated | before: anon → reaches body (42883); after: anon **401**, A admin → B **403**, A → own church passes guard. Advisor: anon-executable definer fns **8 → 0**; search_path warnings 30 → 25 |
| E7 sign-in writes | per-page `PATCH users.last_login_at` (blocked by guard) + spoofable browser `login_events` inserts + signed-out users-by-email lookup/alerts | `record_staff_sign_in()` (own row only; guard allows last_login_at solely via its txn-local flag); browser writes removed | 0 denied login calls on sign-in; direct PATCH last_login_at **403**, direct role PATCH **403**; DB: QA users who signed in have fresh last_login_at + 1 success event each |
| update-user-role (**not deployed** before) | church_admin/staff_leader could grant **super_admin** (also via reactivate); status unvalidated; inactive callers allowed | authorization in `policy.ts` (unit tests 4/4): active super_admin/church_admin only; elevated roles only by super_admin; validated role/status; deployed to staging | staff caller **403**; other church **404**; self **400**; bad role/status **400**; A admin sets A-STAFF pastor → staff **200/200** (restored) |
| E3 Users page | browser inserts of `users` rows (2nd row with random id; row without login) — always denied | replaced with guidance (Edit to change role; invitations create accounts) | lint 0 → 0 |
| E9 facilities | anon could read `booker_*` contact columns | column grants: anon gets public columns only; public page selects them explicitly | anon `booker_email` **401**; anon public cols **200** |
| E10 image buckets | any authenticated user could upload/delete any path in `asset-images`/`facility-images`; anon could list | church-folder write policies; listing policies dropped | B → A folder **400/400**; A → own **200/200** |
| E12 | browser wrote `service_role_key` into platform-wide `automation_settings` | call + "Enable Triggers" button removed | — |

Queued: the five analytics RPC bodies are broken (42883) → dashboard/reporting phase; E1 member-data RLS matrix; E4 provisioning permission alignment; E11 incident gate key; E5 tenant credential columns readable by all tenant staff → solved by IntaSend server-side secrets (G1–G5); Auth "leaked password protection" toggle (user, dashboard); remaining 25 search_path warnings (Phase 6 inventory).


### §5 remaining items — E1, E4, E11 (20 Nov 2026)

| Item | Root cause | Fix | Evidence |
|---|---|---|---|
| **E1 cross-church isolation matrix** | Impersonation matrix (rolled-back txn, `SET LOCAL ROLE authenticated` + JWT sub) over **all 177 public tables with tenant_id**, counting rows of OTHER churches, for member A, staff A, admin A, member B → `church_media_items` leaked 2 foreign rows to all four. Policy audit: `church_media_items` / `sermon_archives` **ALL USING (true)** for authenticated; `media_albums`, `media_categories`, `church_storage` (+ `church_media_items.tenant_isolation`) **tautological** `tenant_id = (select tenants.id … where tenants.id = X.tenant_id)`; `church_storage` INSERT check (true); `quiz_answers/events/participants` **ALL USING (true) for PUBLIC** (anyone could modify/delete); `sermon_reactions` DELETE USING (true) for PUBLIC | `20261120170000_p5_close_permissive_policies.sql`: church-scoped policies (media/sermon writes on `communication_tools` key; storage staff-only); quizzes keep public SELECT/INSERT (anonymous players) with session check, no public DELETE, participant UPDATE kept (documented low-stakes gap); reactions delete-own only | after: **0 leaking tables of 177** for all four actors, with positive controls (own rows visible) |
| E1 follow-on: **portal members saw empty catalogues** | portal members are linked via `member_auth_memberships`, not `members.user_id` (0/3 match) → `actor_has_tenant` never admits them; 13 member-facing tables had staff-only reads | `20261120180000_p5_member_portal_reads.sql`: extra SELECT policy `private.member_has_tenant()` on giving/store/discipleship/WhatsApp/media/facility catalogues (not internal request notes) | member A store categories visible **0 → 2**; still 0 leaks |
| **E4 provisioning authorization** | `member-provision-access` allowed only admin roles while member creation allows `member_management` staff → "member saved, portal access forbidden" | `policy.ts` mirrors `can_write_permission(…,'member_management')` (unit 1/1); deployed **v5** (verify_jwt on) | A staff → **200 already_provisioned** (no new identity; links 3); B staff → **403** |
| **E11 incident/asset gate** | pages gate on `reports_analytics`; DB allowed any staff to write incidents/assets/maintenance | `20261120190000`: reads tenant staff, writes `can_write_permission(…,'reports_analytics')`; status-log inserts follow | admin sets A-STAFF read_only → incident write **403**, read **OK**; restriction removed → write **201**; cleanup verified (0 rows left) |

Queued: `volunteer_hours` member own-rows read; quiz participant UPDATE cannot be bound to anonymous players (accepted gap); media/sermon pages have no frontend isReadOnly gate yet (media deferred).


### §5 close-out — final loopholes (20 Nov 2026, user: "close all the loopholes and close Phase 5")

| Loophole | Fix | Evidence |
|---|---|---|
| **E5 provider secrets readable by every staff member** (`tenants` Daraja/PayHero/WhatsApp/Africa's Talking keys, `sms_settings.at_api_key`, unsalted SHA-256 `branches.branch_password_hash`) | migration `20261120200000`: column-level SELECT grants (secrets excluded) for authenticated (anon narrowed only where it had table-level SELECT); writes unchanged so admins can still set/rotate keys. 9 browser `select("*")` sites → explicit lists (`src/lib/tenantColumns.ts`); SMS pages show "configured" instead of the key; contract test `src/test/p1/settings/tenantColumns.test.ts` (safe list == schema − secrets; no `select(*)`/secret reads) | Preview `958ffc8`: staff → secret cols **403**, `select=*` **403**, sms key **403**, branch hash **403**; anon secret **401**; safe cols / sms status / anon public lookup **200**; sign-in + General Settings save OK, 0 failed calls |
| Public church page | was already failing for anon (`select("*")` vs column-limited anon grant) → `TENANT_PUBLIC_COLUMNS` | anon public lookup 200 |
| **Quiz scores writable by anyone** | score/coins/streak computed by `quiz_answers` trigger; public UPDATE on `quiz_participants` removed (church staff may update); one answer per question; points 0–10000; solo answers (no session) allowed | `scripts/recovery/p5-quiz-scoring-pglite-harness.mjs` 4/4 (real migration SQL), added to blocking CI |
| volunteer_hours member read | members read only their own hours (via `member_auth_memberships`) | policy applied |

Phase 5 user actions / logged follow-ups: **enable "Prevent use of leaked passwords"** (Auth → Attack Protection) on staging and Production; **CAPTCHA protection: leave OFF** until a CAPTCHA widget is added to sign-in/OTP pages (enabling it alone blocks all logins) — readiness C9. Pre-existing breakages found (not Phase 5): quiz host/join write a non-existent `member_id` column (Finding 20, Phase 8); Communications SMS settings use non-existent `sozuri_*` columns (SMS phase); analytics RPC bodies crash (42883, reporting).


## §6 Phase 6 — Edge Functions, security events, launch scope (20 Nov 2026)

**User decisions:** app email (Resend), SMS, push, Sentry feed in-app, AI, media, livestream are DEFERRED for the 24 Nov launch (memory `launch-provider-decisions`). Leaked-password protection needs a paid plan → required on Production (Pro).

**Finding 8 (Security Alerts static) — root cause:** Security Centre reads `security_alerts`, but nothing wrote it server-side (0 rows); access-log and active-sessions functions not deployed; staff could forge/delete alerts. **Fix** (`20261120210000`): `report_failed_sign_in()` (rate-limited, no enumeration) → `failed_login` (low) / `brute_force_attempt` (high, 3 in 10 min); triggers for role change / admin grant / status change / staff invitation; browser read (staff) + resolve (`reports_analytics`) only. `get-active-sessions` / `get-security-access-log` deployed **administrator-only**. Page refreshes every 30 s. **Evidence** (`staging-canary-phase6-alerts.spec.ts`, Preview `a1cd4bd`): 3 wrong passwords → `failed_login:low` + `brute_force_attempt:high`; unknown email → nothing; role change ×2 → `role_changed:medium` ×2; admin sessions/log 200, staff 403; staff forge alert 403; delete 0 rows; Security Centre shows the brute-force alert, 0 failed calls. Sentry/PostHog: not a security-alert source for launch (user decision); Sentry stays in its own dashboard.

**Function inventory (staging):** 76 in repo, 11 deployed at start, 45 called by the browser. After review now deployed: + update-user-role (Phase 5 policy), get-active-sessions, get-security-access-log, generate-church-code, fetch-og-metadata, platform-admin-overview (15 total).

| Function | Finding | Action |
|---|---|---|
| generate-church-code | unauthenticated; anyone could rewrite any church's member-login code | church admins of that church only; deployed; live 401/403/403 |
| fetch-og-metadata | unauthenticated arbitrary-URL fetch (SSRF / open proxy) | staff only + unit-tested URL guard (scheme/port/credentials/internal names/private, loopback, link-local, metadata, IPv4-mapped IPv6), resolved-IP check, manual redirects re-validated, 512 KB cap; deployed; live: 6 SSRF targets 400, public page 200 |
| process-email-automations | anyone with the public key could process every church's automations | scheduler (service role) → all; admin → own church; NOT deployed (email deferred) |
| create-staff-thread | no auth at all | no remaining browser caller → stays undeployed (note: new staff get no directory thread — messaging follow-up) |
| platform-admin-overview | reviewed: platform super admin only, read-only | deployed; church admin → 403 |
| AI / Canva / email / SMS / push / Sentry functions | deferred areas | not deployed; calls short-circuit (guard) |
| Payment functions (PayHero/Daraja) | replaced by IntaSend | Phase 9/10 |

CORS: functions use `Access-Control-Allow-Origin: *` with bearer-token auth (no cookies) → no ambient-credential risk; accepted.

**Launch-scope gating:** `src/config/launchFlags.ts` (`VITE_FEATURE_<AREA>=true` re-enables per environment) + `src/lib/functionGuard.ts` (FunctionsClient guard) + `isAdminPathEnabled/isMemberPathEnabled` hook. Contract test `src/test/p1/launchScope.test.ts` classifies every browser-called function. Evidence (`staging-canary-phase6-scope.spec.ts`, Preview `6d3de63`, Church A with Resources & Media ON): AI Tools / Graphics / Church Studio / Songs / Church Media / Sermon Prep / Livestreaming absent from nav; direct URLs redirect to dashboard; 0 deferred-function requests (push registration no longer fires); 0 page errors.

**CI:** `app-typecheck` failure on `e8cfdcb` (SmsSettings: untyped query) fixed in `c2a415f` → CI green; also fixed SMS form never prefilling (React Query v5 removed `onSuccess`).


## §7–8 Phases 7 and 8 (20 Nov 2026)

**Phase 7 — Church Studio removal (product decision):** the sidebar entry, breadcrumb, placeholder route, module mapping and the dead, never-routed `ChurchStudio.tsx` are removed (`04cb1f0`). The shared `studio_media` table/data is KEPT (member sermons/home read it). Contract test asserts removal + data retention. Findings 12, 13, 15, 16 deferred with media/livestream (`DEFERRED_BACKLOG.md`).

**Phase 8 — root causes**
| Finding | Root cause | Fix |
|---|---|---|
| 17 Discipleship resources + categories | `discipleship_resources` / `resource_categories` had RLS enabled with **zero policies** (fixed Phase 5, `20261120140000`); category errors were swallowed | real error messages; verified |
| 18 Outreach activity | `outreach_activities.title` is NOT NULL but the form sent only `name` → every save 23502; error swallowed | `title` mirrors `name`; real error message |
| 20 Training publish (non-AI) | course builder was an **unwired shell**: steps 2–4 were placeholder comments, `setLessons` never called, Publish only advanced steps (no-op on step 4), nothing ever saved; member side read a non-existent `course_lessons` table and non-existent enrollment/completion columns; `training_courses` readable by staff only | builder steps 2–4 wired to the existing editor/publish/summary components; Save draft + Publish write `training_courses` + `course_lessons`; edit loads; quiz step shows "coming later" (AI deferred). Migration `20261120220000`: `course_lessons`, enrollment `member_id`/`progress_percentage`, completion `member_id`/`lesson_id`/`tenant_id`, server-side progress trigger, church-scoped RLS (staff manage via `groups_ministries`; members read published courses and manage only their own enrollments/completions; members cannot set progress) |

Build incident: `a2afe03` Preview failed to build (import inserted inside a multi-line import in Outreach.tsx) → fixed `83fd0e9`; pre-push lint-all + `npm run build` adopted.

**Evidence** (`e2e/qa/staging-canary-phase8.spec.ts`, Preview `vestry-bkxh863g3` = `83fd0e9`; Discipleship module enabled for QA Church A, Church B untouched):

| Check | Result |
|---|---|
| F17 category created (listed in Manage Categories); resource (external link) created → "Resource created successfully", visible after reload, 0 failed calls | **PASS** — DB: resource `external_link`, Church A |
| F18 outreach activity → "Activity logged", visible after reload | **PASS** — DB: `title` = `name`, Church A |
| F20 course with 2 lessons → Publish → "Course published…", listed on /training after reload | **PASS** — DB: `published`, 2 `course_lessons`, Church A |
| F20 member A (impersonation, rolled-back txn): sees course 1 / lessons 2; enroll OK; forge progress=100 → 0 rows; complete 1 of 2 lessons → progress **50** | **PASS** |
| F20 member B: course 0 / lessons 0 / cannot enroll | **PASS** |

Known gaps (queued): live quiz host/join still write non-existent `quiz_participants.member_id` (T2); scheduled publishing not supported (UI says so); resource↔category assignment covered by schema/FK but not separately canaried.


## §9 Phase 9 — Finance (20 Nov 2026)

| Finding | Root cause (verified on staging) | Fix |
|---|---|---|
| 21 Payouts | form offers `cheque` / `processed`, not in `payment_method_enum` / `payment_status_enum` → POST 400; no visible feedback | enum values added; amount validated; real error message |
| 22 Chart of accounts | **`chart_of_accounts` table did not exist** (404) while `seed_chart_of_accounts()` inserted into it; `ledger_entries` had no account column → journal lines lost their account | table created (church-scoped; `ledger_entries.account_id` composite FK to same-church account); seed idempotent, not anon-executable; journal lines save `account_id` |
| 23 Accounts payable | "Mark as Paid" wrote `paid`, not an enum value → PATCH 400 | enum value `paid` added (page logic already uses it); row-change verified |
| 24 Expenses | **no UPDATE policy** → approve/reject updated 0 rows while showing success | policies + row-change verification (no false success) |
| all ("nothing happens") | 13 finance/giving pages use **react-hot-toast, whose Toaster was never mounted** → every success/error message was invisible | `<HotToaster />` mounted once in App |

Migration `20261120230000`: also aligns payouts / accounts_payable / ledger_entries / expenses / chart_of_accounts writes to `can_write_permission(<church>, 'financial_records')` (the pages' gate; previously any staff via FOR ALL tenant policies).

**Evidence** (`e2e/qa/staging-canary-phase9.spec.ts`, Preview `vestry-1aysgwjuk` = `d141940`; Giving & Finance enabled for QA Church A only): F22 setup → 27 accounts, balanced 2-line entry posted, both lines carry `account_id`; F21 payout cheque/processed persists; F23 invoice `paid` persists after reload; F24 expense `approved` (approver recorded) persists; 0 failed calls, 0 page errors. Church B admin (rolled-back txn): sees 0 of A's payouts / accounts, updates 0 of A's expenses, seeding A's chart refused (42501). Tenants 12. Lint and type-error counts unchanged; production build passes.

Not yet: IntaSend payment flows (STK push / giving / subscriptions / payout disbursement) — need IntaSend sandbox keys (`DEFERRED_BACKLOG.md` R2).


## §10 Phase 10 — Finance completeness & settings (20 Nov 2026)

| Item | Before | After |
|---|---|---|
| Budget utilisation (product) | "Spent" summed in the browser from EVERY approved expense whose category NAME matched — across all budgets/periods (double counting); no way to record spend, no history/audit | `budget_expenditures` (traceable; never edited/deleted; reversal with reason; a source counts once among active rows), approved expenses linked to a line sync automatically (reversed if un-approved, moved if re-linked), `spent_amount` server-maintained, `budget_audit_log`. Per-line ⋮: Record expenditure (overspend warning, link a paid invoice), Edit line (audited), View details (allocated / spent / remaining / % + progress + history + reverse) |
| Payroll staff (product) | edit plumbing existed but nothing opened it; no deactivate/delete | ⋮ Edit / Deactivate–Reactivate (end date; excluded from active totals; history kept) / Delete (confirm; refused when payroll history exists); row-change verified |
| Finding 27 Tax | tables existed but had zero policies until Phase 5 → "static"; no tax rates at all | Tax Rates tab: enable switch (`tax_settings.tax_enabled`), add / edit / deactivate rates (name, %, description, inclusive/exclusive); configuration only, never auto-applied |
| Branding (product) | Settings → Branding was a "coming soon" placeholder | removed from sidebar and routes; logos (General Settings) and email branding (Communications) untouched |

Migration `20261120240000`; RLS: budgets / budget lines / expenditures / payroll_staff writes need `financial_records`; `tax_rates` need `church_settings`; audit log read-only (staff).

**Evidence:** PGlite harness `scripts/recovery/p10-budget-pglite-harness.mjs` 4/4 on the real migration SQL (spend/reversal/no-edit; cross-church + wrong-line blocked; expense sync once / un-approve / re-approve / re-link with history 3 rows, 1 active; audit) — added to CI. Browser canary `e2e/qa/staging-canary-phase10.spec.ts` (Preview `vestry-46stp0r78` = `cdd4a74`): Branding absent; payroll add → edit prefilled → deactivate persists (`inactive`, end date); budget created → expenditure recorded → history → reversed (spent back to 0, 1 reversed row kept, 7 audit rows); tax enabled → rate added 16% → edited to 8% inclusive → deactivated, persists. 0 failed calls, 0 page errors. Church B (rolled-back txn): sees 0 of A's budgets / expenditures / tax rates / payroll; updates 0 of A's tax rates. Type-error counts at baseline for all 6 files; lint unchanged/improved; build passes.

## §11 Day 2 — Payments build + pre-launch follow-ups (21 Nov 2026)

| Item | Change | Evidence |
|---|---|---|
| G1–G3 IntaSend M-Pesa giving | `process-stk-push` + `intasend-webhook` rewritten for IntaSend (pending-first, status-API confirmation, amount/currency match, idempotent event log, never downgrade); migration `20261121090000` (routing switch super-admin only, member own-gift read, Realtime publication) | commit `e941114`; helper tests 6/6 (CI); deployed v1 both; webhook without secrets → 503. **Live STK test blocked on sandbox keys.** |
| G7 member cash gift | portal no longer inserts/self-confirms cash or bank gifts | lint 11→7 |
| T11 search_path | migration `20261121110000` | staging 0 unpinned; `generate_church_code` smoke OK |
| T4 staff directory thread | migration `20261121120000` (trigger on `public.users`; guard bypass only via transaction-local flag set by the definer function) | rolled-back txn: A 2 threads/2 participants, idempotent, Church B admin self-update OK + thread, client directory insert refused 42501, member A sees 2, member B refused 42501, flag reset. Applied; backfilled QA Church A/B only (2+2). `handle_new_user` md5 unchanged. |
| T6 resend invitation | Users page “Send set-password email” replaces the always-409 invite button | lint 0→0 |
| T2 live quiz | deferred behind `VITE_FEATURE_LIVE_QUIZ` (broken for every player; see backlog) | launchScope test covers `/training/host` |
| Gate B pre-flight | now 332 versions / 20 recovery + `payment_events` | staging: 332 = 332, no drift |

**Evidence (commit `5b6583b`, Preview `vestry-akmxm8jft` verified = `5b6583b` via GitHub deployment status; CI 3/3 green):** `e2e/qa/staging-canary-day2.spec.ts` 2/2 — no Launch Live buttons, `/training/host/*` redirected, `/join/ABC123` shows “not available”, Users page shows “Send set-password email to …” and no “Send invitation” button; 0 page errors (pre-existing `custom_roles` 404 logged as T16). Phase 10 regression rerun **inconclusive (environment)**: this workstation had swap 2.0/2.0 GiB used and ~0.5 GiB RAM free (other Java/Gradle processes); headless Chrome stalled on the animated finance pages for BOTH today’s Preview and yesterday’s `cdd4a74` Preview (where the same canary passed) → rerun on an idle machine. **23 Nov rerun on idle machine: Phase 10 (4) + day-2 (2) canaries 6/6 PASS** on `vestry-akmxm8jft` (= `5b6583b`). P1 161/161, P2 contracts 53/53, typecheck ratchet PASS, build PASS.

## §12 Pre-production scope — live quiz + member-declared gifts (23 Nov 2026)

| Item | Change | Evidence |
|---|---|---|
| T2 live quiz | Was a mock end to end (no authoring, fake quizzes in launch dialog, non-existent columns, players unable to read sessions, answer key would reach players, 10 never-run components that would crash). Now: quiz library (staff with `groups_ministries`), server game API (`quiz_join` / `quiz_player_state` / `quiz_submit_answer` for anyone with the PIN + player token; `quiz_host_create_session` / `quiz_host_control` / `quiz_host_state` for staff), questions frozen per game, answers scored on the server by speed, answer revealed only after the host reveals; direct table access for players removed. Old quiz components / LaunchSessionModal / waiting + results views deleted; `VITE_FEATURE_LIVE_QUIZ` flag removed. | Rolled-back txn 36/36 (authoring validation, cross-church host denied, member cannot read quizzes, anon join/duplicate name/bad PIN, anon cannot read tables or host, wrong token, answer hidden before reveal, one answer per question, invalid choice, direct insert blocked, late/time-up answers refused, invalid transitions, final leaderboard, join after end refused). Unit 4/4. |
| G7b member-declared gifts | `member_declare_gift` (member resolved server-side; pending only; limits) + `staff_review_member_gift` (`financial_records`, reason required to reject, first decision wins, reviewer recorded). Member portal: cash / bank transfer with date + reference, “awaiting confirmation” / “not confirmed: reason” in history, no receipt until confirmed. Giving Records: “Awaiting confirmation” queue. | Rolled-back txn 19/19 (own church only, amount/method/date limits, member cannot self-confirm or review, anon/other church refused, staff confirm/reject, reason required, double review refused, 10-open limit). |

Typecheck ratchet 864 → **804** (baseline lowered). Build passes; P1 165/165; P2 53/53.

**Browser evidence** (`e2e/qa/staging-canary-live-quiz-gifts.spec.ts`, Preview `vestry-bxt1ko196` = `54a4d1f`, deployment id verified): 2/2 PASS, 0 failed calls, 0 page errors. T2: admin wrote a quiz via Training → Launch Live Quiz, saved (persists after reload), hosted (PIN `RU4RAN`); a separate signed-out browser joined at `/join/RU4RAN`, answered, host auto-revealed when everyone answered, player saw “Correct!”, leaderboard → final results, player “#1 of 1”. DB: session ended, 1 player (token hash set), 1 answer correct 989 pts (speed-scored). G7b: two gifts declared by the Church A member through `member_declare_gift`; admin confirmed one and rejected the other (Reject disabled until a reason is typed); DB: confirmed / cancelled with reason, reviewer + time recorded. Tenants 12.

Note: a second Vercel project `vestry-hub-ole7` also deploys this branch — check its env/purpose before Gate A.

## §13 Pre-production scope — analytics (T1) + storage usage (T12) (23 Nov 2026)

| Item | Change | Evidence |
|---|---|---|
| T1 analytics | The five `*_optimized` analytics functions failed on every call (`varchar = uuid`); gift totals counted pending / failed / cancelled (and member-declared) gifts; top donors showed “Unknown” for members; performance metrics read non-existent `pg_stat_user_indexes` columns. Fixed (confirmed gifts only, member names, real columns, search_path ''); result shapes unchanged. Only the (unmounted) admin PerformanceMonitor calls them — Dashboard / Analytics use other, working functions. | Rolled-back txn 14/14: all five work for Church A admin + staff; a pending 99,999 gift is excluded; Church B admin, member of A, member of B, unknown user, NULL church and anon all refused. |
| **Security** `private.assert_own_church` | `NOT (super_admin OR church = get_staff_tenant_id())` is NULL (not true) for any signed-in account without a staff row, so the IF never raised → members of ANY church passed for ANY church. Only these five wrappers used it; no data leaked because the bodies crashed. Now NULL means “not allowed”. A scan of all 35 identity-checking functions found no other such check. | Test 08 failed before the fix (member allowed) and passes after. |
| T12 storage usage | `storage_used_gb` was never updated (13 screens wrote it from the browser; always refused) → every church showed 0 GB and upload limit checks never triggered. Now `refresh_storage_usage(church)` (church staff; NULL-safe) sums the church's files in Storage (`<tenant_id>/…`, 20/20 objects on staging), stores and returns it; `refresh_all_storage_usage()` (platform admin) for the Churches list. The 16 browser writes replaced by a server refresh; `useSubscription` reads live usage; Billing shows MB under 1 GB. No trigger on `storage.objects` (would risk every upload). Note: staging has **no** `tenant_subscriptions` rows (defaults apply). | Rolled-back txn 10/10: computed bytes = direct sum (1,432 B for Church A), stored on the subscription row; staff of A OK; B admin / member / NULL / anon refused; refresh-all only for platform admin (12 churches). |

Typecheck 804 → 804; lint unchanged or lower in all 17 edited files; build OK; P1 165/165; P2 53/53.

**Browser evidence:** `e2e/qa/staging-canary-t12-storage.spec.ts` on Preview `vestry-gc7sge241` (= `25d257c`, deployment id verified): Billing calls `refresh_storage_usage` (200; 1,432 bytes for QA Church A) and shows that server figure; 0 failed calls, 0 page errors. Display now uses KB below 1 MB.

## §14 Pre-production scope — custom roles + multi-role staff (T5/T16) (23 Nov 2026)

Product rules (user, 23 Nov): a person may hold several roles; effective access per area = the most generous among their custom roles that set it; custom roles are per-area templates (full / read-only / no access); only church admins create or assign roles.

| Change | Detail |
|---|---|
| Tables | `custom_roles` (name, description, per-area `permissions`, soft delete) and `staff_role_assignments` (extra built-in non-admin roles and custom roles per person). Validated in the DB (known areas/levels only, reserved built-in names, one active name per church, only staff of the same church, admin roles cannot be added as extra roles). RLS: staff of the church read; only church admins write. |
| Effective level | `private.effective_permission_level`: per-person override → most generous active custom role → default. `private.can_write_permission` (behind ~125 policies) now honours it; read-only and no access both block writes; church admins unchanged. `my_permission_levels()` gives the app the same answer. |
| App | `usePermissions` reads the server levels (`isNoAccess` added); pages of a “no access” area show “You don't have access” (path → area map; personal settings stay reachable). Users page: custom roles get an access grid; Edit user → “Additional roles” (church admins); extra-role badges in the list; custom roles removed from the MAIN role dropdowns (the `users_role_check` constraint only allows built-in roles — the old option always failed). |
| Not done | “No access” does not hide menu items (option not chosen) and does not block API reads of that area's data — backlog. |

Evidence: rolled-back txn 24/24 (staff cannot create/assign roles; invalid area/level/reserved/duplicate names refused; extra admin role refused; cross-church assignment refused; with “Youth Leader” (finance none, members read-only, events full) staff could update **0** of Church A's 2 payouts (2 before); adding “Finance Committee” (finance full) restored finance (most generous); a per-person override wins; deactivating roles removes their effect; Church B staff sees none of A's roles; Church B admin cannot assign in A; Church A admin unaffected; member gets no levels). P1 168/168 (+3 path-mapping), P2 53/53, PGlite harnesses 37/37, typecheck 804 → **776** (Users page 28 → 0), build OK.

**Browser evidence** (Preview = `ef4482a`, deployment id verified): `e2e/qa/staging-canary-t5-roles.spec.ts` 3/3 — admin created a role with Financial Records = No access (summary shown), ticked it as an additional role for A-STAFF (badge shown after reload); A-STAFF got the no-access page on Giving Records and Payroll but not on Members; admin removed + deleted the role; A-STAFF has Finance again; DB left clean (0 assignments, 0 active roles). The first run exposed that the tick only showed after the list reloaded → made immediate (reverts if refused). **Regression** after the `can_write_permission` change: Phase 5 read-only (per-person override: write 403 while read-only, reads OK, write 201 after removal), Phase 9 finance, Phase 10, Phase 3 operations — 14/14 PASS.

## Security observations queued for later phases
- `public.tenants` stores provider credentials (`daraja_consumer_secret`, `at_api_key`, `whatsapp_access_token`, …) in ordinary columns → Phase 5 RLS/column-privilege review.

## Human-only actions outstanding
1. ~~Church A / Church B staff canaries~~ DONE 20 Nov. Canary emails live in git-ignored `.env.canary.local` (NOT `.env.qa.local`).
2. Confirm origin of the 04:55 UTC self-signup tenant.
3. Member canaries A-MEMBER / B-MEMBER after Phase 2 staging deploy.
