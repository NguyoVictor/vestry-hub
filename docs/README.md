# VestryHub Technical Documentation

> Ground-truth product intent: [`00-product-context.md`](./00-product-context.md)  
> Structural index (routes, migrations, RLS overview): produced 2026-06-15 from code audit.

## Area guides

| Doc | Scope |
|---|---|
| [`auth.md`](./auth.md) | Admin signup/signin, onboarding, invites, member login, guards |
| [`permissions.md`](./permissions.md) | `usePermissions`, override tables, **known gaps** (`feature_permissions`) |
| [`messaging.md`](./messaging.md) | Staff directory, DMs, admin inbox, edge functions |
| [`payments.md`](./payments.md) | STK push, webhooks, giving propagation |
| [`settings.md`](./settings.md) | `/settings/*` routes, module toggles, integrations |
| [`admin-flows.md`](./admin-flows.md) | Admin portal routes, staff invites, member approval |
| [`member-flows.md`](./member-flows.md) | Member portal routes, registration, approval gate |
| [`edge-functions-gap.md`](./edge-functions-gap.md) | 17 deployed functions missing from local repo |

## Doc vs code discrepancies (quick reference)

See inline **⚠️ DISCREPANCY** / **🚧 GAP** callouts in each area doc. Summary:

- First church creator: product doc says `church_admin`; code uses **`super_admin`**
- Onboarding service picks → `tenant_metadata.priority_needs` only; **not** `enabled_modules`; admin nav **not filtered**
- `feature_permissions` table: **saved in UI, never enforced at runtime** (dead feature)
- `/church-studio`: real page exists but route hits **PlaceholderPage**
- Dashboard: labels and query semantics differ from product doc (see `admin-flows.md`)
