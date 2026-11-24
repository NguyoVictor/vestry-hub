# Vestry Hub — Production readiness tracker (Gate A + Gate B)

Living list of everything that must be true before code reaches the live
domains. Updated at every phase close. Nothing here is done without evidence
in `RECOVERY_STATUS.md`. **No item below authorises touching Production or
Vercel Production settings; each needs the user's explicit go-ahead.**

Legend: ⬜ open · 🔶 in progress · ✅ done (with evidence) · 🔒 needs user decision/approval

_Last updated: 2026-11-20 (after Phase 2 acceptance)._

## A. Release mapping & environments (blocks Gate A)
| # | Item | Status | Notes |
|---|---|---|---|
| A1 | **R-1:** split Vercel `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` per environment (Production ≠ staging) | 🔧 plan ready — `docs/recovery/GATE_AB_RUNBOOK.md` §2 (approval at Gate A) | Live `main` hard-codes churchapp `crjdsxxkspvdwknrmijs`; shared Vercel var = staging. Merging unchanged would repoint live domains to staging. |
| A2 | Confirm which Supabase project is the real Production (churchapp vs another) and record its ref | 🔒 user | Read-only inspection of the live bundle showed churchapp. |
| A3 | Remove hard-coded churchapp URLs (`MemberWelcome.tsx:55`, `CommunicationsSettings.tsx:282`, `test-payhero-stk/index.ts:30`) | ✅ fixed locally (Phase 3 commit) | CI guard `check-no-hardcoded-supabase-projects.mjs` |
| A4 | `supabase/config.toml` `project_id` label still churchapp | ✅ now staging label (Phase 3 commit) | Local label only; linked ref is staging. |
| A5 | `STAFF_INVITATION_REDIRECT_ORIGIN` + Auth redirect allowlist set for the **Production** domain (`/auth/invite`, `/auth/reset-password`) | ⬜ Gate B | Staging uses a Preview origin; `stagingInviteOrigin()` deliberately rejects non-`*.vercel.app` origins → needs a reviewed production variant. |
| A6 | Vercel Production auto-deploy behaviour on merge to `main` reviewed | ⬜ Gate A | |
| A7 | **LIVE ISSUE (pre-existing):** `main` builds the payment callback URL from `VITE_SUPABASE_URL` = staging → churches that copied it into Daraja/PayHero send live callbacks to staging (function not deployed there → lost) | 🔒 user: check which live churches configured payments | Fixed by recovery branch + env split; see GATE_AB_RUNBOOK F-A2. |
| A8 | Merge to `main` auto-deploys Production; DB and frontend are not backward-compatible → coordinated window (deploy with --skip-domain, migrate, promote) | 🔧 runbook §3 | |

## B. Database & data (blocks Gate B)
| # | Item | Status | Notes |
|---|---|---|---|
| B1 | **Production backup** (DB + Storage) taken and restore-tested | 🔒 Gate B | Staging backup waiver does NOT apply. |
| B2 | Rehearse the migration chain on a copy of Production | ⬜ Gate B | Recovery migrations so far: `20261119101722`, `20261120043624`, `20261120052702`, `20261120083842`, `20261120100000`, `20261120120000`, `20261120140000`, `20261120150000`, `20261120160000`, `20261120170000`, `20261120180000`, `20261120190000`, `20261120200000`, `20261120210000`, `20261120220000`, `20261120230000`, `20261120240000` (+ later phases). Production trigger text may differ → guarded patches will refuse; must inspect first. |
| B3 | **Backfill member portal links** for pre-existing members (staging: 16 of 19 had none) | 🔧 tool ready: `member-portal-backfill` (dry-run default; church admin = own church; deployed + dry-run tested on staging: 1 linked / 2 candidates). Run in Gate B window after approval | Reviewed one-off or admin Retry per member; without it existing members can't sign in. |
| B4 | Migration-history parity Production vs repo | ⬜ Gate B | |
| B5 | Rollback snapshots for every trigger patch captured from Production before applying | ⬜ Gate B | Staging snapshots in `docs/recovery/rollback/`. |
| B6 | Explain/clean the 20 Nov 04:55 UTC self-signup tenant on staging (not a canary) | 🔒 user | Not deleted; awaiting user confirmation of origin. |
| B7 | Orphan `service_request_types` rows (7 on staging) for a deleted tenant; table has no FK to `tenants` | ⬜ cleanup | Decide FK + cleanup; check Production. |
| B8 | **RLS-enabled tables with zero policies** (44 on staging; policies removed outside migrations). Run the same inventory on Production BEFORE applying `20261120140000`; Production may still have the old broad policies → review/replace rather than add alongside | 🔧 `docs/recovery/gate-b/preflight_production_readonly.sql` reports it (validated on staging) | Query in RECOVERY_STATUS §5. |

## C. Auth & email
| # | Item | Status | Notes |
|---|---|---|---|
| C1 | **Custom SMTP** on Production (and staging) | ⬜ 🔒 provider credentials | Built-in Supabase email rate limit blocked OTPs twice on 20 Nov. |
| C2 | Magic Link email template contains `{{ .Token }}` on Production | ⬜ Gate B | Staging verified working (8-digit code). |
| C3 | Production OTP length known; UI accepts 6–10 | ✅ | D-2 fix `401b055`. |
| C4 | JWT signing keys: staging = ES256; verify Production setting and `verify_jwt` behaviour | ⬜ Gate B | |
| C5 | "Resend staff invitation" path (expired invite → today only password reset) | ⬜ Phase 5 | |
| C6 | Leaked-password protection & Auth advisor items | 🔒 user: Auth → Attack Protection → "Prevent use of leaked passwords" ON (staging + Production) | |
| C9 | CAPTCHA protection: keep OFF until hCaptcha/Turnstile widget is added to staff sign-in + member OTP request (enabling alone blocks logins) | ⬜ post-launch | |

## D. Edge Functions & secrets
| # | Item | Status | Notes |
|---|---|---|---|
| D1 | Deploy exactly the reviewed functions to Production (no bulk deploy) | ⬜ Gate B | Staging versions: send-invitation v4, member-provision-access v4, member-otp-request v1, member-login v8, member-session-context v6, member-register v8 (+ later phases). |
| D2 | Production function secrets present (names only verified) | ⬜ Gate B | |
| D3 | Rate limiting / abuse control on public `member-register` and `member-otp-request` | ⬜ Phase 6 | |
| D4 | Production function set = exactly the reviewed launch list (`src/test/p1/launchScope.test.ts` DEPLOYED_REVIEWED, 15 functions); deferred-area functions must NOT be deployed; Production build without VITE_FEATURE_* flags | ⬜ Gate B | |
| D5 | Supabase plan for Production supports leaked-password protection (Pro) → enable it | ⬜ Gate B | Not available on free staging. |
| D6 | Re-enabling a deferred area (email/SMS/push/AI/media/livestream) = review + deploy its functions, set provider secrets in function secrets, then set VITE_FEATURE_<AREA>=true | ⬜ post-launch | |

## G. Payments (user decision 2026-11-20: IntaSend)
| # | Item | Status | Notes |
|---|---|---|---|
| G1 | Payments and payment prompts (M-Pesa STK push) move to the **IntaSend API** | 🔧 staging: process-stk-push (IntaSend) + intasend-webhook deployed (inactive until secrets set); pages switched to intasend_enabled | Current code uses PayHero/Daraja: `supabase/functions/test-payhero-stk`, `payment-webhook`, `c2b-webhook`, `subscription-payment-webhook`, and Daraja/PayHero credential columns on `public.tenants`. Inventory all callers before replacing. |
| G2 | IntaSend **sandbox** keys for staging; live keys only for Production at Gate B | 🔒 user provides | Secrets go in Supabase function secrets only, never in the browser bundle, Git or tenants columns. |
| G3 | IntaSend webhook/callback signature verification + idempotent payment recording | 🔧 challenge constant-time + status-API confirmation + amount/currency match + idempotent event log (unit tests 6/6) | Callback URL must derive from `SUPABASE_URL` (A3 pattern). |
| G4 | Decommission or gate the PayHero/Daraja paths once IntaSend is verified | ⬜ Phase 10 | Preserve historical payment records. |
| G5 | End-to-end sandbox test: STK prompt → callback → persisted payment → ledger/receipt | ⬜ Phase 9 | No live transactions before Gate B approval. |
| G6 | **Business decision:** IntaSend model | ✅ 23 Nov: **one IntaSend account per church** (church accounts KYC-verified). Built: migration `20261123160000` (each church's secret key in Supabase Vault; webhook challenge stored as a hash; browsers see status only), `intasend-connect` (church admins; keys checked with IntaSend `GET /wallets/` before storing), `process-stk-push` + `intasend-webhook` use the church's own key and `?church=<id>` webhook; Settings → Payments rebuilt. | Each church: connect keys in Settings → Payments, then add the shown Endpoint + Challenge in IntaSend → Settings → Webhooks (event: Collection). |
| G7 | Member "cash" gift from the portal inserts `payment_status: confirmed` from the browser (today blocked by RLS → fails); should record `pending` for staff confirmation | ✅ 21 Nov | Member portal no longer writes cash/bank gifts (no self-confirmation); explains the finance team records them; submit only for M-Pesa. A "member-declared pending gift" queue for staff is a post-launch feature. |
| G8 | Register the webhook in IntaSend (Settings → Webhooks): URL `<SUPABASE_URL>/functions/v1/intasend-webhook`, event `collection_event`, same challenge as `INTASEND_WEBHOOK_CHALLENGE` (staging now, Production at Gate B) | 🔒 user | |

## E. Permissions & security
| # | Item | Status | Notes |
|---|---|---|---|
| E1 | Member-data RLS matrix (member A cannot read church B data via portal APIs) | ✅ staging (§5 remaining items) | Link/session isolation already proven. |
| E2 | Staff can open Settings → Users and Add (UI); server denies | ✅ server-side denial + UI guidance (`a72d505`) | |
| E3 | `Users.tsx` browser insert into `public.users` path | ✅ browser inserts removed (`a72d505`) | |
| E4 | Provisioning authorisation aligned with `can_write_permission('member_management')` | ✅ staging (§5 remaining items) | |
| E5 | Provider credentials stored in plain `public.tenants` columns | ✅ staging: secret columns not browser-readable (`958ffc8`, 20261120200000); IntaSend keys must go to function secrets (G2) | |
| E6 | Supabase security advisor findings triaged | ⬜ Phase 5 | |
| E7 | Admin page load: `login_events` insert and `users.last_login_at` update denied (403) by RLS on every load | ✅ staging (`a72d505`, migration 20261120150000) | Silent; decide server-side recording (e.g. auth hook) vs. RLS grant. |
| E8 | Browser PATCHes `tenant_subscriptions.storage_used_gb` after uploads → 403 (RLS correctly denies); usage never recorded | ⬜ billing phase | Move storage accounting server-side (trigger on storage.objects or Edge Function). |
| E9 | `facilities_public_read_safe`: anyone can read all churches' active facilities | ✅ staging | Confirm intended for public booking page; scope by tenant slug if not. |
| E10 | `asset-images` / `facility-images` storage policies: any authenticated user may upload/delete any path | ✅ staging | Tenant-folder scoping like Phase 4 buckets. |
| E11 | Incident Management read-only gate uses `reports_analytics` permission | ✅ staging (§5 remaining items) | |
| E12 | `CommunicationsSettings.tsx` upserts `service_role_key` into platform-wide `automation_settings` from the browser (denied by RLS) | ✅ staging | Remove the call. |
| E13 | **Analytics RPCs were executable by anon with no caller check** (latent cross-church leak) | ✅ staging (20261120160000) | Production: verify the same functions/grants before Gate B; their bodies are broken (42883) → reporting phase. |
| C7 | `update-user-role` must be deployed to Production with the Phase 5 policy (was missing on staging) | ⬜ Gate B | |
| C8 | `member-provision-access` v5 (Phase 5 policy) to Production | ⬜ Gate B | |
| B9 | Run the E1 isolation matrix (RECOVERY_STATUS §5) and permissive-policy audit on Production before/after Gate B migrations | ⬜ Gate B | Script pattern: rolled-back txn, impersonate member/staff/admin of two churches. |

## F. Quality gates (blocks Gate A)
| # | Item | Status | Notes |
|---|---|---|---|
| F1 | CI `app-typecheck` green and **blocking** | 🔶 blocking via ratchet (no new errors); baseline errors still to burn down | ≥10 errors (announcements, types drift). `src/integrations/supabase/types.ts` regenerated from staging 20 Nov: 124 → 219 tables. |
| F7 | **6 tables referenced by code are absent on staging:** `chart_of_accounts` (Finding 22), `fund_transactions`, `invoices`, `journal_entries`, `journal_lines`, `payroll_payments` | ⬜ Phase 9 | Decide per table: create via reviewed migration vs. repoint code to existing tables. Verify Production schema separately. |
| F2 | Real browser E2E (disposable local Docker QA + preview bypass token) | ⬜ Phase 1 | |
| F3 | All 27 findings + 4 product items ACCEPTED | 🔶 20 accepted · 1 awaiting sign-off (27) · 6 deferred (10, 11, 12, 13, 15, 16) = 27 | Findings 1–9, 14, 17–19, 20 (non-AI), 21–26 ACCEPTED 20 Nov; 27 + Phase 10 product items STAGING_TEST_PASS; 10, 11, 12, 13, 15, 16 + AI part of 20 DEFERRED (user scope). |
| F9 | Storage buckets on Production: create `facility-thumbnails`, `incident-attachments`, `church-logos` via migration `20261120120000`; verify Production bucket list first (names/visibility may differ) | ⬜ Gate B | Deferred media buckets (`church-media`, `sermon-recordings`, `quiz-documents`) only if media ships. |
| F8 | New churches get **no service request types** → requests unusable | ✅ staging (migration `20261120100000`) | Production: the migration's backfill seeds only churches with zero types — review the Production count first (Gate B rehearsal). |
| F4 | Untested Finding 1 paths canaried: CSV import, QR self-registration | ⬜ | |
| F5 | Full staging UAT sign-off | 🔒 user | |
| F6 | Release tag + exact SHA recorded | ⬜ Gate A | |

- 24 Nov: IntaSend fee — **giver pays** (`CUSTOMER-PAYS`, explicit in process-stk-push); giving pages show the fee note.
