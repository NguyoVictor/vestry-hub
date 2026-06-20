# VestryHub Technical Documentation

> Ground-truth product intent: [`00-product-context.md`](./00-product-context.md)  
> Structural index (routes, migrations, RLS overview): produced 2026-06-15 from code audit.

## Area guides

| Doc | Scope |
|---|---|
| [`auth.md`](./auth.md) | Admin signup/signin, onboarding, invites, member login, guards |
| [`permissions.md`](./permissions.md) | `usePermissions`, override tables, **known gaps** (`feature_permissions`) |
| [`messaging.md`](./messaging.md) | Staff directory, DMs, bulk comms, `at-sms` vs `africastalking-sms` |
| [`payments.md`](./payments.md) | Daraja STK (active), legacy Pesapal/IntaSend webhooks, cron jobs |
| [`settings.md`](./settings.md) | `/settings/*` routes, module toggles, integrations |
| [`admin-flows.md`](./admin-flows.md) | Admin portal routes, staff invites, member approval |
| [`member-flows.md`](./member-flows.md) | Member portal routes, registration, approval gate |
| [`edge-functions-gap.md`](./edge-functions-gap.md) | Edge function inventory — **64 local, 65 deployed, 0 missing** |

## Doc vs code discrepancies (quick reference)

See inline **⚠️ DISCREPANCY** / **🚧 GAP** callouts in each area doc. Summary:

- First church creator: product doc says `church_admin`; code uses **`super_admin`** (`handle_new_user` trigger + `on-signup` webhook)
- Dual signup bootstrap: DB trigger **`handle_new_user`** and edge **`on-signup`** can both create tenant/user — verify Auth hook wiring
- Onboarding service picks → `tenant_metadata.priority_needs` only; **not** `enabled_modules`; admin nav **not filtered**
- `feature_permissions` table: **saved in UI, never enforced at runtime** (dead feature)
- `/church-studio`: real page exists but route hits **PlaceholderPage**
- Dashboard: labels and query semantics differ from product doc (see `admin-flows.md`)
- Giving: **Daraja** active in UI; **Pesapal/IntaSend** webhooks legacy (no frontend invoke)
- Staff invites: UI uses **`send-invitation`**; **`invite-user`** is legacy/unused

## Edge functions — invoke summary

| Category | Examples |
|---|---|
| **Frontend invoke** | `process-stk-push`, `send-invitation`, `member-login`, `send-communication`, `at-sms`, … (~40) |
| **Webhook / provider callback** | `payment-webhook`, `c2b-webhook`, `pesapal-webhook`, `intasend-webhook`, `whatsapp-webhook`, `africastalking-delivery-webhook` |
| **Auth hook** | `on-signup` |
| **Cron (no UI)** | `check-pledge-overdue`, `check-attendance-risk`, `notify-task-deadlines`, `notify-meeting-deadlines`, `reset-email-quota`, `reset-monthly-credits`, `process-email-automations` |
| **Legacy / utility (not invoked from `src/`)** | `invite-user`, `initiate-payment`, `generate-receipt`, `run-payroll`, `generate-quiz`, `generate-child-qr-codes` |

Full list: [`edge-functions-gap.md`](./edge-functions-gap.md).
