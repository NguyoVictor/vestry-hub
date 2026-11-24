# Vestry Hub — Deferred backlog & requirements to prepare

**Purpose:** everything deliberately set aside during the recovery (launch 2026-11-24), so we can return to it after the phases are complete, plus the accounts/credentials the user should start preparing.
**Maintained with:** `RECOVERY_STATUS.md` (evidence), `PRODUCTION_READINESS.md` (Gate A/B checklist).
**Last updated:** 2026-11-20 (after Phase 6).

---

## 1. Accounts & requirements to prepare

Never paste keys into chat. When a key is ready, put it in the git-ignored file named below and tell Claude; it is loaded into Supabase **function secrets** (server only) without printing.

### A. Needed BEFORE launch (Gate B — Production)

| # | Requirement | Why | What to prepare |
|---|---|---|---|
| R1 | **Supabase Pro plan** for the Production project | Point-in-time backups (Gate B backup), leaked-password protection, higher Auth/email limits | Upgrade the real Production project; confirm which project is Production (`churchapp crjdsxxkspvdwknrmijs` today serves the live site) |
| R2 | **IntaSend account(s)** (payments, Phase 9/10) | Replaces PayHero/Daraja for M-Pesa STK push, card, payouts | 1) IntaSend **sandbox** account → publishable key + secret key (staging). 2) **Live** account with business KYC (certificate of registration/incorporation, KRA PIN, director IDs, bank or M-Pesa settlement details) → live keys only at Gate B. 3) Webhook "challenge" secret for each. Put sandbox keys in `.env.functions.local` as `INTASEND_PUBLISHABLE_KEY=`, `INTASEND_SECRET_KEY=`, `INTASEND_WEBHOOK_CHALLENGE=` |
| R3 | **Custom SMTP for Production Auth emails** | Member OTP codes and staff invitations; Supabase's built-in mailer is rate-limited | An SMTP provider on your domain (e.g. Resend SMTP, SendGrid, Brevo, Google Workspace) + sender address (e.g. `no-reply@vestryhub.com`) |
| R4 | **Domain DNS access** for `vestryhub.com` | SPF/DKIM/DMARC for the sender domain; Auth redirect URLs | Registrar/DNS login |
| R5 | **Vercel Production environment variables** split from Preview (R-1 hazard) | Merging today would point the live site at staging | Production `VITE_SUPABASE_URL` + publishable key of the real Production project (approval at Gate A) |
| R6 | **Production monitoring keys** | Error + product analytics on the live app | `VITE_SENTRY_DSN` (Sentry project), `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST` (PostHog project) for Production |
| R7 | **Production redirect/allowlist values** | Staff invitation + password reset links | `STAFF_INVITATION_REDIRECT_ORIGIN`, `MEMBER_AUTH_REDIRECT_ORIGINS` for the Production domain; Auth URL allowlist `/auth/invite`, `/auth/reset-password` |

### B. Needed LATER (to switch deferred features back on)

| # | Feature | Provider / requirement | Secrets (function secrets unless noted) |
|---|---|---|---|
| L1 | App emails (welcome, booking confirmation, broadcasts, legal/data-request notices, automations) | **Resend** account + verified sending domain | `RESEND_API_KEY` |
| L2 | SMS | **Africa's Talking** account (sandbox + live), registered **Sender ID**, airtime/credit | per-church username + API key (entered in Settings → SMS; stored server-side) and platform `AT_USERNAME`, `AT_API_KEY` |
| L3 | Push notifications | **Firebase** project (Cloud Messaging) | `FCM_SERVICE_ACCOUNT` (JSON); frontend `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_MESSAGING_SENDER_ID`, `_APP_ID`, `_VAPID_KEY` |
| L4 | AI tools, Bible insights, sermon assistant, AI course/quiz generation, audio transcription | **Groq** API account | `GROQ_API_KEY` |
| L5 | Graphics Studio | **Canva Connect** developer app (OAuth) | `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` (+ redirect URL registration) |
| L6 | WhatsApp Business messaging | **Meta** developer app + WhatsApp Business account (embedded signup) | frontend `VITE_META_APP_ID`, `VITE_META_CONFIG_ID`; per-church access token stored server-side |
| L7 | Sentry feed inside Security Centre | Sentry **read-only auth token** | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_BASE_URL` |
| L8 | CAPTCHA on sign-in / member OTP request | **Cloudflare Turnstile** or **hCaptcha** | site key (frontend) + secret (Supabase Auth → Attack Protection). Only enable in Supabase AFTER the widget is added to the pages |
| L9 | Livestreaming | Stream source (YouTube channel / embed links as currently built) | none server-side today; needs review |

---

## 2. Deferred feature areas (hidden for launch)

Mechanism: `src/config/launchFlags.ts` + `src/lib/functionGuard.ts`. Pages are hidden/redirected for admins and members, and calls to their server functions short-circuit with "not available yet". **Re-enable an area:** review + deploy its functions → set provider secrets → set `VITE_FEATURE_<AREA>=true` for that Vercel environment → update `src/test/p1/launchScope.test.ts` (move functions to DEPLOYED_REVIEWED) → browser canary.

| Area / flag | Report findings | Pages hidden | Functions (not deployed) | Needs |
|---|---|---|---|---|
| AI (`VITE_FEATURE_AI`) | **10** AI Tools, **11** Bible Explorer insights, AI part of **20** (course/quiz generation) | `/ai-tools` (Bible Explorer page stays; its AI insight calls are guarded) | generate-ai-content, generate-ai-email, generate-sermon, transcribe-audio, process-sermon-archive, generate-quiz | L4 Groq |
| Media (`VITE_FEATURE_MEDIA`) | **12** song details/setlists, **13** church media upload & albums, **15** sermon save/publish; product: **remove Church Studio** | `/graphics-studio`, `/church-studio`, `/song-library`, `/church-media`, `/sermon-preparation`, `/sermons`, `/member/church-media`, `/member/sermons` | canva-api, canva-oauth | L5 Canva; buckets `church-media`, `sermon-recordings`, `quiz-documents` do not exist on staging |
| Livestream (`VITE_FEATURE_LIVESTREAM`) | **16** | `/livestreaming`, `/settings/livestreaming`, `/member/livestreaming` | — | L9 |
| App email (`VITE_FEATURE_APP_EMAIL`) | — (product) | none (sending actions show "not available yet") | send-communication, send-member-welcome, send-booking-confirmation, legal-signature-notify, data-download-request, website-consultation, process-email-automations (hardened, not deployed), send-bible-reminder | L1 Resend |
| SMS (`VITE_FEATURE_SMS`) | — | none (send/balance actions guarded) | africastalking-sms, africastalking-balance, at-sms, send-whatsapp-message | L2 (and L6 for WhatsApp) |
| Push (`VITE_FEATURE_PUSH`) | — (report saw register-device-token CORS errors) | — (token registration skipped) | register-device-token, send-push-notification | L3 Firebase |
| Sentry feed (`VITE_FEATURE_SENTRY_FEED`) | part of **8** (Finding 8 itself is done with server-generated alerts) | Sentry panel in Super Admin dashboard | fetch-sentry-issues | L7 |
| Payment dev tools (`VITE_FEATURE_PAYMENT_DEV_TOOLS`) | — | PayHero/bank test panels (dev builds only) | test-payhero-api, test-payhero-stk | removed when IntaSend lands |

---

## 2b. Moved INTO pre-production scope (user decision 23 Nov 2026)

These must be done before the Production release (Gate A/B), not after launch:

| # | Item | Size estimate |
|---|---|---|
| T2 | Live multiplayer quiz — server-side game API (join by PIN, questions without answers, scoring, host controls) | ✅ built 23 Nov (migration `20261123100000`; quiz library `/training/quizzes`, host `/training/host/:id`, players `/join`) — browser canary PASS (54a4d1f) |
| G7b | Members log cash/bank gifts as **pending** → staff "Awaiting confirmation" queue → confirm / reject | ✅ built 23 Nov (migration `20261123110000`; member portal Give + Giving Records queue) — browser canary PASS (54a4d1f) |
| T5 + T16 | Custom roles table + multi-role staff (one person, several roles) | ✅ 23 Nov (migration `20261123140000`; rules: several roles, most generous wins, per-area templates, church admins only). Follow-up done 24 Nov for **Finance**: “no access” now also blocks reading finance data through the API (migration `20261124090000`); other areas still block writes + pages only |
| T1 | Dashboard / member / financial / activity / performance analytics RPC bodies (varchar vs uuid) | ✅ 23 Nov (migration `20261123120000`) — also fixed a NULL-unsafe guard (`assert_own_church`) that let any non-staff account through |
| T12 | Storage-usage tracking server-side (`tenant_subscriptions.storage_used_gb`) | ✅ 23 Nov (migration `20261123130000`); server-side upload *blocking* remains a follow-up |
| T14 | Branch logins redesigned server-side (no browser-side SHA-256 hashes) | ✅ 23 Nov (migration `20261123150000`; user decision: personal accounts per branch — shared branch passwords retired) |
| T17 | Server-function errors show “Edge Function returned a non-2xx status code” instead of the function's own message on most screens | 23 Nov canary | ✅ 23 Nov: fixed centrally in `src/lib/functionGuard.ts` (all 73 call sites): the reply body is read from a copy and its message surfaced as `error.message` and `data.error` (unit 3/3) |
| T15 | Clear the type-error backlog (864 errors) | multi-day; high regression risk if rushed |

## 3. Technical follow-ups queued during the phases (fix after the launch phases)

| # | Item | Found in | Notes |
|---|---|---|---|
| T1 | Dashboard analytics RPC bodies crash (`42883 varchar = uuid`) — dashboard/member/financial/activity/performance analytics | Phase 5 | Callers are now guarded (own church only); bodies in `private.*_impl` need type fixes |
| T2 | Live multiplayer quiz broken end to end: players cannot read `quiz_sessions` (staff-only RLS), join/host write non-existent `quiz_participants.member_id` and omit `tenant_id`/`display_name`, join route param mismatch, waiting room URL lacks participant id; player screens would also download the answer key | Phase 5 | **21 Nov: deferred behind `VITE_FEATURE_LIVE_QUIZ`** (Launch Live buttons + `/training/host` hidden; old `/join` links show “not available”). Needs a server-side game API (join by PIN, question without answers, scoring). Self-paced course quizzes unaffected. |
| T3 | Communications SMS settings use non-existent `sms_settings.sozuri_*` columns (two SMS providers in code) | Phase 5 | Decide one provider when SMS returns (L2) |
| T4 | New staff get no staff-directory message thread (create-staff-thread has no safe caller) | Phase 6 | ✅ **21 Nov** migration `20261121120000`: trigger on `public.users` creates the thread when a row becomes active staff (never blocks the write). Existing staff: optional backfill `docs/recovery/gate-b/t4_staff_directory_backfill.sql` (**product decision** — makes all staff visible to members); run on staging QA Church A/B only. `create-staff-thread` function obsolete (never deploy). |
| T5 | Users page: one account = one role; adding a second role to an existing person not supported (old code created unusable rows) | Phase 5 | Product decision |
| T6 | No "resend staff invitation" path (expired invite → password reset only) | Phase 1B.2 | ✅ **21 Nov** Users page: the per-row “Send invitation” button always failed (409, every listed person already has an account) → replaced with “Send set-password email” (→ `/auth/reset-password`, allowlisted) for admins. |
| T7 | Orphan `service_request_types` rows (7) for a deleted tenant; table has no FK to tenants | Phase 3 | B7 |
| T8 | Backfill member portal links for pre-existing members (Production) | Phase 2 | B3 — required before Gate B |
| T9 | Media/sermon pages have no read-only (isReadOnly) gate in the UI (DB enforces) | Phase 5 | with media re-enable |
| T10 | Quiz participant rows of anonymous players cannot be bound to the player | Phase 5 | accepted, game-only |
| T11 | 25 functions without pinned `search_path` (advisor WARN) | Phase 5 | ✅ **21 Nov** migration `20261121110000` (`public, extensions, pg_temp`, behaviour-neutral); staging: 0 unpinned |
| T12 | `tenant_subscriptions.storage_used_gb` is never updated (browser PATCH correctly denied) | Phase 4 | move storage accounting server-side (billing) |
| T13 | `tenants`/`sms_settings`/`branches` use column-level SELECT grants — every NEW column needs an explicit GRANT + `src/lib/tenantColumns.ts` update | Phase 5 | contract test enforces |
| T14 | Analytics/branch password login: unsalted SHA-256 branch hashes; branch login not implemented | Phase 5 | redesign server-side if branches ship |
| T16 | Users page reads/writes `custom_roles`, which does not exist (404 PGRST205). Reads fall back to an empty list; “create custom role” shows an error (no false success) | 21 Nov canary | Hide the custom-role UI or build the table with T5 (multi-role) |
| T15 | Typecheck baseline: 874 pre-existing type errors (ratchet prevents new ones) | Phase 1 | burn down gradually |
