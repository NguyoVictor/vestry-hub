# Phase 1 Stage 11B — Security Centre & Platform Administration

## Scope

Stage 11B closes the privileged-surface gaps around tenant security monitoring, Sentry/PostHog telemetry, active sessions, and the platform Super Admin area.

## Repairs

- Tenant Security Centre now obtains tenant-wide login events through the JWT-protected `get-security-access-log` Edge Function after server-side tenant-actor authorization.
- `get-active-sessions` now validates that the caller is an active staff actor in the requested tenant before invoking the privileged session RPC.
- Security Centre Export Logs now produces a real CSV rather than a cosmetic button.
- Platform-wide Sentry and PostHog telemetry was removed from the church-level Security Centre and placed on the Super Admin dashboard.
- `fetch-sentry-issues` now requires an active platform super admin in addition to JWT verification.
- Sentry issues are no longer copied into arbitrary church `security_alerts` rows.
- Super Admin platform data now comes through `platform-admin-overview`, which independently verifies `users.is_super_admin = true` and active status server-side.
- Legacy `church_storage` / `storage_plans` screens were removed from Super Admin because those tables are not present in the live schema.
- Super Admin now uses the live `tenant_subscriptions` and `subscription_payment_attempts` foundation for platform metrics, church subscription status, capacity usage, recent payments, and pending plan changes.
- The previous non-functional Storage Requests UI is now an accurate read-only Subscriptions surface rather than presenting approve/decline actions against missing tables.

## Live Edge Functions

Required Stage 11B functions:

- `fetch-sentry-issues` — JWT + platform-super-admin authorization.
- `get-security-access-log` — JWT + same-tenant staff authorization.
- `get-active-sessions` — JWT + same-tenant staff authorization.
- `platform-admin-overview` — JWT + platform-super-admin authorization.

## Regression gates

```bash
npm run test:p1:stage11b:contract
npm run test:e2e:stage11b
npx tsc --noEmit
```

Protected browser coverage uses `PW_FULL_ADMIN_STORAGE_STATE` to prove a normal church admin cannot enter `/superadmin`. A disposable platform-super-admin state can be supplied with `PW_PLATFORM_SUPERADMIN_STORAGE_STATE` to execute the platform happy path.
