# Payments & Giving

> Cross-ref: [`00-product-context.md`](./00-product-context.md) §5.2, [`admin-flows.md`](./admin-flows.md), [`member-flows.md`](./member-flows.md)

Primary payment rail: **M-Pesa STK push** via church Daraja / PayHero credentials.

---

## STK push flow (admin + member)

### Initiation

| UI | File | Edge function |
|---|---|---|
| Admin Give Online | `src/pages/finance/GiveOnline.tsx` | **`process-stk-push`** |
| Member Give | `src/pages/member/MemberGive.tsx` | **`process-stk-push`** |
| Member pledges | `src/pages/member/MemberPledgeCampaigns.tsx` | **`process-stk-push`** |

Also available locally: **`initiate-payment`** (PayHero path) — alternate/legacy integration.

⚠️ **DISCREPANCY:** Product context mentions `process-stk-push` or `initiate-payment`. **Production UI uses `process-stk-push`** for the main giving flow.

### User experience (Give Online)

**File:** `src/pages/finance/GiveOnline.tsx`

1. User enters amount + M-Pesa phone → invokes `process-stk-push`.
2. Modal shows church name, amount, **90-second countdown**.
3. User completes PIN on phone.

⚠️ **DISCREPANCY:** Product context asks whether countdown reflects Safaricom expiry. **Code uses fixed 90s client timer** (`countdown: 90`), not API-driven expiry.

### Confirmation propagation

After `giving_records.payment_status` → `confirmed`:

| Mechanism | Detail |
|---|---|
| **Realtime** | `postgres_changes` on `giving_records` filter `id=eq.{givingRecordId}` |
| **Polling fallback** | Every **2s** SELECT until terminal state |

Same pattern documented in product context §5.2 — **confirmed in code**.

### Surfaces that read giving data

| Surface | Route / file |
|---|---|
| Dashboard “Today's Giving” | `src/pages/Dashboard.tsx` — separate query on `giving_records` |
| Dashboard giving chart / today's donations | `Dashboard.tsx` |
| Give Online history | `GiveOnline.tsx` |
| Giving Records | `src/pages/finance/GivingRecords.tsx` |

⚠️ **DISCREPANCY:** Dashboard hero card labeled **“Today's Giving”**; product doc says **“Giving Today”**. Same data, different label.

---

## Webhooks & callbacks

| Function | Local? | Purpose |
|---|---|---|
| `payment-webhook` | Yes | Daraja STK callback → update `giving_records` |
| `c2b-webhook` | Yes | Customer-initiated M-Pesa (C2B) |
| `process-stk-push` | Yes | Initiate STK |
| `register-credentials` | Yes | Store Daraja keys (`PaymentsPage.tsx`) |
| `register-c2b-urls` | Yes | Register C2B URLs with Safaricom |
| `register-payment-channel` | Yes | PayHero paybill/till setup |
| `initiate-payment` | Yes | PayHero STK + pending record |
| `run-payroll` | Yes | Staff payroll disbursement |
| `pesapal-webhook` | **No — deployed only** | Pesapal |
| `intasend-webhook` | **No — deployed only** | IntaSend |
| `generate-receipt` | **No — deployed only** | Receipt PDF/generation |

See [`edge-functions-gap.md`](./edge-functions-gap.md).

---

## Configuration UI

| Route | File |
|---|---|
| `/settings/payments` | `src/pages/settings/PaymentsPage.tsx` |
| `/settings/giving` | `src/pages/settings/GivingSettings.tsx` |
| `/give-online` | `src/pages/finance/GiveOnline.tsx` |

**Test/diagnostic components:** `src/components/finance/PayHero*.tsx`, `PaymentInfrastructureTest.tsx`

---

## Key tables

| Table | Purpose |
|---|---|
| `giving_records` | Amount, `payment_status`, `mpesa_receipt`, `given_at`, `tenant_id` |
| `pledge_campaigns`, `pledge_commitments`, `pledge_payments` | Pledge flows |
| `integration_settings` / PayHero credential columns | Church payment credentials |

**RLS:** `20260517174709_add_payhero_finance_tables.sql` — `tenant_isolation` on pledge tables; `20260524120000_fix_member_payhero_access.sql` for member read of tenant payhero config.

**Scheduled (deployed only):** `check-pledge-overdue`

---

## Payment status values

Includes `confirmed`, `failed`, `cancelled` (migration `20260526000001_add_cancelled_payment_status.sql`).

Give Online treats `confirmed` as success; `cancelled` / `failed` update modal terminal state.

---

## Finance module routes (non-payment)

`/giving-records`, `/pledge-campaigns`, `/church-expenses`, `/budget-management`, `/payroll`, `/fund-accounting`, `/accounts-payable`, `/general-ledger`, `/payouts` — see [`admin-flows.md`](./admin-flows.md).

Permission key: `financial_records` (`usePermissions`).
