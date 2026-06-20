# Edge Functions — Deployed vs Local Gap

> **Source:** `supabase functions list --project-ref crjdsxxkspvdwknrmijs` compared to `supabase/functions/*/index.ts` in this repo (2026-06-15).

| | Count |
|---|---|
| Deployed on Supabase (`churchapp`) | **65** |
| Present locally (`supabase/functions/`, excl. `_shared`) | **48** |
| **Missing from local repo** | **17** |

## 17 functions deployed but not in local repo

Pull these down before editing or redeploying them:

| # | Function slug | Notes |
|---|---|---|
| 1 | `generate-receipt` | Giving receipt generation |
| 2 | `on-signup` | Auth signup hook / tenant bootstrap (may overlap with `handle_new_user` DB trigger) |
| 3 | `pesapal-webhook` | Pesapal payment webhook |
| 4 | `intasend-webhook` | IntaSend payment webhook |
| 5 | `check-pledge-overdue` | Scheduled pledge overdue checks |
| 6 | `check-attendance-risk` | Scheduled attendance risk alerts |
| 7 | `reset-email-quota` | Cron — reset email sending quota |
| 8 | `notify-task-deadlines` | Cron — follow-up task deadline notifications |
| 9 | `notify-meeting-deadlines` | Cron — board meeting deadline notifications |
| 10 | `at-sms` | **Legacy SMS alias** — `src/pages/settings/NotificationsSettings.tsx` still invokes `at-sms`; local repo has `africastalking-sms` instead |
| 11 | `website-consultation` | Invoked from `src/pages/settings/WebsitePromo.tsx` |
| 12 | `invite-user` | Older invite path (superseded locally by `send-invitation`?) |
| 13 | `build-branded-email` | Standalone branded email builder (local uses `_shared/branded-email.ts`) |
| 14 | `_shared-buildBrandedEmail` | Accidental deploy of shared module as function — likely safe to ignore or undeploy |
| 15 | `test-env` | Diagnostic |
| 16 | `test-resend` | Diagnostic |
| 17 | `check-auth-format` | Auth format validation utility |

## Pull commands

```bash
# Requires Supabase CLI linked to project crjdsxxkspvdwknrmijs
supabase functions download generate-receipt --project-ref crjdsxxkspvdwknrmijs
supabase functions download on-signup --project-ref crjdsxxkspvdwknrmijs
supabase functions download pesapal-webhook --project-ref crjdsxxkspvdwknrmijs
supabase functions download intasend-webhook --project-ref crjdsxxkspvdwknrmijs
supabase functions download check-pledge-overdue --project-ref crjdsxxkspvdwknrmijs
supabase functions download check-attendance-risk --project-ref crjdsxxkspvdwknrmijs
supabase functions download reset-email-quota --project-ref crjdsxxkspvdwknrmijs
supabase functions download notify-task-deadlines --project-ref crjdsxxkspvdwknrmijs
supabase functions download notify-meeting-deadlines --project-ref crjdsxxkspvdwknrmijs
supabase functions download at-sms --project-ref crjdsxxkspvdwknrmijs
supabase functions download website-consultation --project-ref crjdsxxkspvdwknrmijs
supabase functions download invite-user --project-ref crjdsxxkspvdwknrmijs
supabase functions download build-branded-email --project-ref crjdsxxkspvdwknrmijs
supabase functions download test-env --project-ref crjdsxxkspvdwknrmijs
supabase functions download test-resend --project-ref crjdsxxkspvdwknrmijs
supabase functions download check-auth-format --project-ref crjdsxxkspvdwknrmijs
```

Or bulk via dashboard: **Supabase → Edge Functions →** select function → download source.

## 48 functions present locally (all also deployed)

`africastalking-balance`, `africastalking-delivery-webhook`, `africastalking-sms`, `c2b-webhook`, `canva-callback`, `canva-oauth`, `canva-refresh-token`, `create-admin-broadcasts-table`, `create-staff-thread`, `data-download-request`, `fetch-og-metadata`, `fetch-sentry-issues`, `generate-ai-content`, `generate-ai-email`, `generate-child-qr-codes`, `generate-church-code`, `generate-quiz`, `generate-sermon`, `get-active-sessions`, `get-payhero-banks`, `get-supported-banks`, `initiate-payment`, `legal-signature-notify`, `member-login`, `member-register`, `payment-webhook`, `process-email-automations`, `process-sermon-archive`, `process-stk-push`, `receive-booking-response`, `register-c2b-urls`, `register-credentials`, `register-payment-channel`, `reset-monthly-credits`, `run-payroll`, `send-bible-reminder`, `send-booking-confirmation`, `send-communication`, `send-invitation`, `send-member-welcome`, `send-push-notification`, `send-whatsapp-message`, `sync-member-profile`, `test-payhero-api`, `test-payhero-stk`, `transcribe-audio`, `update-user-role`, `whatsapp-webhook`
