# Payments & Giving

> Cross-ref: [`00-product-context.md`](./00-product-context.md) §5.2, [`admin-flows.md`](./admin-flows.md), [`member-flows.md`](./member-flows.md), [`edge-functions-gap.md`](./edge-functions-gap.md)

**Active M-Pesa rail:** Safaricom **Daraja** STK push — **`process-stk-push`** (initiate) + **`payment-webhook`** (callback). C2B uses **`c2b-webhook`** + **`register-c2b-urls`**.

Legacy/alternate gateways (Pesapal, IntaSend, PayHero-initiate) remain deployed with source in repo but are **not** used by current giving UI.

---

## Active flow: Daraja STK push

### Initiation (frontend)

| UI | File | Edge function |
|---|---|---|
| Admin Give Online | `src/pages/finance/GiveOnline.tsx` | `process-stk-push` |
| Member Give | `src/pages/member/MemberGive.tsx` | `process-stk-push` |
| Member pledges | `src/pages/member/MemberPledgeCampaigns.tsx` | `process-stk-push` |

**`process-stk-push`** (`supabase/functions/process-stk-push/index.ts`):

- Reads Daraja credentials from **`tenants`** (`daraja_consumer_key`, `daraja_consumer_secret`, `daraja_passkey`, `daraja_transaction_type`, `payhero_channel_number`).
- Requires `payhero_connected` and Daraja fields configured (Settings → Payments).
- Creates/updates **`giving_records`**, calls Safaricom STK API (`DARAJA_ENV` controls sandbox vs production).

### Callback (server — no frontend invoke)

**`payment-webhook`** — Daraja STK `stkCallback`:

- Matches row by `external_reference` = `CheckoutRequestID`.
- Maps `ResultCode`: `0` → `confirmed` (+ `mpesa_receipt`); `1032`/`1037` → `cancelled`; else → `failed`.

### User experience (Give Online)

**File:** `src/pages/finance/GiveOnline.tsx`

1. User enters amount + M-Pesa phone → invokes `process-stk-push`.
2. Modal shows church name, amount, **90-second countdown**.
3. User completes PIN on phone.

⚠️ **DISCREPANCY:** Product context asks whether countdown reflects Safaricom expiry. **Code uses fixed 90s client timer** (`countdown: 90`), not API-driven expiry.

### Confirmation propagation (UI)

After `giving_records.payment_status` → `confirmed`:

| Mechanism | Detail |
|---|---|
| **Realtime** | `postgres_changes` on `giving_records` filter `id=eq.{givingRecordId}` |
| **Polling fallback** | Every **2s** SELECT until terminal state |

⚠️ **DISCREPANCY:** Dashboard card labeled **“Today's Giving”**; product doc says **“Giving Today”**.

---

## Legacy / inactive payment endpoints (kept deployed)

These functions exist locally and on Supabase. **No `supabase.functions.invoke()` call** for them exists under `src/`. Daraja is the live path for new giving.

### `pesapal-webhook`

**File:** `supabase/functions/pesapal-webhook/index.ts`

- Expects Pesapal IPN JSON (`OrderTrackingId`, `OrderNotificationType`, …).
- Updates `giving_records.payment_status` where `pesapal_transaction_id` = `OrderTrackingId`.
- **Status:** Legacy webhook receiver. Schema still has `giving_records.pesapal_transaction_id` and `integration_provider_enum` includes `'pesapal'`. Legal copy in `Legal.tsx` mentions PesaPal. **Not wired to current Give Online / Member Give UI.**

### `intasend-webhook`

**File:** `supabase/functions/intasend-webhook/index.ts`

- Expects IntaSend invoice payload; maps `state` → `payment_status`.
- Also matches on **`pesapal_transaction_id`** column (shared legacy reference field).
- **Status:** Legacy webhook receiver. Same schema/legal references as Pesapal. **Not wired to current giving UI.**

### `initiate-payment`

**File:** `supabase/functions/initiate-payment/index.ts`

- PayHero STK push using global `PAYHERO_BASIC_AUTH` secret + `channel_id`.
- Creates pending `giving_records` row.
- **Status:** Alternate integration path; used only in test components could invoke it but **no production page invoke found**. Superseded for churches by Daraja via `process-stk-push`.

### `generate-receipt`

**File:** `supabase/functions/generate-receipt/index.ts`

- Input: `{ giving_record_id }`.
- Generates HTML receipt → `giving-receipts` storage bucket → signed URL on `giving_records.receipt_url`.
- **Status:** Server-side utility; **not invoked from frontend**. Could be called post-payment via future hook/cron.

---

## Other payment-related functions (active)

| Function | Trigger | Purpose |
|---|---|---|
| `register-credentials` | `PaymentsPage.tsx` | Save/validate Daraja credentials on `tenants` |
| `register-c2b-urls` | `PaymentsPage.tsx` | Register Safaricom C2B URLs |
| `c2b-webhook` | Safaricom C2B POST | Record paybill payments |
| `register-payment-channel` | PayHero test/setup components | PayHero channel registration |
| `run-payroll` | **Not invoked from `src/`** | B2C payroll disbursement via PayHero (edge function exists; Payroll UI may use direct API/DB) |
| `get-payhero-banks` / `get-supported-banks` | Payment setup tests | Bank lists |
| `test-payhero-api` / `test-payhero-stk` | Diagnostic components | PayHero connectivity |
| `check-auth-format` | Manual/diagnostic | Inspects PayHero auth secret format |

---

## Scheduled (cron — no frontend)

| Function | Schedule (per source comments) | Action |
|---|---|---|
| `check-pledge-overdue` | Daily | `pledges.status` → `overdue` when campaign `end_date` &lt; 7 days ago |
| `check-attendance-risk` | Weekly | Inserts `notifications` (`type: attendance_risk`) for **`users`** absent from last 3 sessions per service type |
| `notify-task-deadlines` | Cron | `follow_up_tasks` due 7d/1d → admin notifications |
| `notify-meeting-deadlines` | Cron | `board_meetings` 24h/1h reminders |
| `reset-email-quota` | 1st of month | Reset `email_quotas.monthly_sent` |
| `reset-monthly-credits` | Billing period | Subscription credits (`tenant_subscriptions`) |
| `process-email-automations` | Cron | Automated email sends |

---

## Configuration UI

| Route | File |
|---|---|
| `/settings/payments` | `src/pages/settings/PaymentsPage.tsx` — Daraja + C2B |
| `/settings/giving` | `src/pages/settings/GivingSettings.tsx` |
| `/give-online` | `src/pages/finance/GiveOnline.tsx` |

---

## Key tables & columns

| Table / column | Notes |
|---|---|
| `giving_records` | `payment_status`, `mpesa_receipt`, `checkout_request_id`, `external_reference`, `given_at` |
| `giving_records.pesapal_transaction_id` | **Legacy shared ref** — used by Pesapal/IntaSend webhooks, not Daraja STK |
| `tenants.daraja_*` | Active Daraja credentials |
| `tenants.payhero_connected` | Gate for `process-stk-push` |
| `pledges` | Updated by `check-pledge-overdue` |

**RLS:** `20260517174709_add_payhero_finance_tables.sql`; `20260524120000_fix_member_payhero_access.sql`.

---

## Payment status values

`confirmed`, `failed`, `cancelled`, `pending`, `voided` (Pesapal REVERSED maps to `voided`).

Give Online / Member Give: `confirmed` = success; `cancelled` / `failed` = terminal modal states.
