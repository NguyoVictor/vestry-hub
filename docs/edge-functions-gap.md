# Edge Functions — Inventory & Sync Status

> **Verified:** 2026-06-15 after full download/commit of previously missing functions.

| | Count |
|---|---|
| Local function directories (`supabase/functions/*/index.ts`, excl. `_shared`) | **64** |
| Deployed on Supabase (`churchapp` / `crjdsxxkspvdwknrmijs`) | **65** |
| Missing from local repo | **0** (real functions) |
| Deploy-only artifact (not a repo folder) | **1** — `_shared-buildBrandedEmail` |

## Previously missing — now local (16 functions)

These were pulled down and are present under `supabase/functions/`:

| Function | Purpose (from source) |
|---|---|
| `generate-receipt` | Builds HTML receipt, uploads to `giving-receipts` bucket, sets `giving_records.receipt_url` |
| `on-signup` | Auth webhook handler: on `auth.users` INSERT, creates `tenants` + `users` (`super_admin`, `onboarding_completed: false`) |
| `pesapal-webhook` | Pesapal IPN → updates `giving_records` by `pesapal_transaction_id` |
| `intasend-webhook` | IntaSend webhook → same column, maps invoice state to `payment_status` |
| `check-pledge-overdue` | Daily cron: flags `pledges` as `overdue` when campaign past 7 days |
| `check-attendance-risk` | Weekly cron: inserts `notifications` for **`users`** (not `members`) absent 3 consecutive sessions per service type |
| `reset-email-quota` | Monthly cron: resets `email_quotas.monthly_sent` for non-free plans |
| `notify-task-deadlines` | Cron: `follow_up_tasks` due in 7d/1d → admin notifications |
| `notify-meeting-deadlines` | Cron: `board_meetings` 24h/1h reminders → admin notifications |
| `at-sms` | Tenant-scoped AT SMS (`tenants.at_username/at_api_key`); `check_balance` / `send_sms` actions |
| `website-consultation` | Inserts `website_consultation_requests`, emails platform admin via Resend |
| `invite-user` | Legacy staff invite: `createUser` + optional recovery email (not used by current UI) |
| `build-branded-email` | HTTP wrapper around shared branded email builder |
| `test-env` | Diagnostic |
| `test-resend` | Diagnostic |
| `check-auth-format` | Inspects `PAYHERO_BASIC_AUTH` secret format (diagnostic) |

## Shared modules (not deployable functions)

| Path | Used by |
|---|---|
| `supabase/functions/_shared/buildBrandedEmail.ts` | `invite-user`, `website-consultation`, `build-branded-email` |
| `supabase/functions/_shared/branded-email.ts` | `send-invitation`, `send-communication`, etc. |
| `supabase/functions/_shared/placeholder-replacer.ts` | Email templating |

## Deploy-only ghost function

Supabase still lists **`_shared-buildBrandedEmail`** as a deployed edge function (accidental deploy of shared code). It has **no** local `index.ts` folder and should not be redeployed from this repo. Safe to ignore or undeploy from dashboard.

## Full local inventory (64)

`africastalking-balance`, `africastalking-delivery-webhook`, `africastalking-sms`, `at-sms`, `build-branded-email`, `c2b-webhook`, `canva-callback`, `canva-oauth`, `canva-refresh-token`, `check-attendance-risk`, `check-auth-format`, `check-pledge-overdue`, `create-admin-broadcasts-table`, `create-staff-thread`, `data-download-request`, `fetch-og-metadata`, `fetch-sentry-issues`, `generate-ai-content`, `generate-ai-email`, `generate-child-qr-codes`, `generate-church-code`, `generate-quiz`, `generate-receipt`, `generate-sermon`, `get-active-sessions`, `get-payhero-banks`, `get-supported-banks`, `initiate-payment`, `intasend-webhook`, `invite-user`, `legal-signature-notify`, `member-login`, `member-register`, `notify-meeting-deadlines`, `notify-task-deadlines`, `on-signup`, `payment-webhook`, `pesapal-webhook`, `process-email-automations`, `process-sermon-archive`, `process-stk-push`, `receive-booking-response`, `register-c2b-urls`, `register-credentials`, `register-payment-channel`, `reset-email-quota`, `reset-monthly-credits`, `run-payroll`, `send-bible-reminder`, `send-booking-confirmation`, `send-communication`, `send-invitation`, `send-member-welcome`, `send-push-notification`, `send-whatsapp-message`, `sync-member-profile`, `test-env`, `test-payhero-api`, `test-payhero-stk`, `test-resend`, `transcribe-audio`, `update-user-role`, `website-consultation`, `whatsapp-webhook`

## Frontend invoke vs cron/webhook-only

| Invoked from `src/` | Cron / webhook / unused |
|---|---|
| See each area doc | `on-signup`, `payment-webhook`, `c2b-webhook`, `pesapal-webhook`, `intasend-webhook`, `africastalking-delivery-webhook`, `whatsapp-webhook`, `receive-booking-response`, cron jobs above, `generate-receipt`, `invite-user`, `initiate-payment`, diagnostics |
